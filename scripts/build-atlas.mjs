import { createWriteStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));

const limit = Number(args.limit ?? 0);
const shardCount = Number(args.shards ?? 128);
const outputRoot = path.resolve(args.out ?? "public/data/atlas");
const fields = ["accession", "id", "protein_name", "organism_name", "organism_id", "length", "protein_families", "xref_pdb"];
const sourceUrl = args.url ?? `https://rest.uniprot.org/uniprotkb/stream?format=tsv&query=reviewed%3Atrue&fields=${fields.join("%2C")}`;

const regions = [
  ["catalysis", "Catalytic systems", [0, 0, 0]],
  ["transport", "Transport and channels", [78, 18, -38]],
  ["signalling", "Signals and receptors", [-72, 28, -34]],
  ["genome", "Genome maintenance", [24, -58, 62]],
  ["expression", "Translation and expression", [-34, -62, 48]],
  ["immunity", "Immunity and defense", [62, 54, 48]],
  ["structure", "Structural proteins", [-66, 48, 52]],
  ["metabolism", "Metabolic networks", [18, 62, -68]],
  ["membrane", "Membrane systems", [-18, 4, -86]],
  ["viral", "Viral proteins", [72, -52, -8]],
  ["regulation", "Regulation and control", [-76, -24, -46]],
  ["unresolved", "Unresolved function", [4, -8, 92]],
].map(([id, label, center]) => ({ id, label, center }));

const regionRules = [
  ["viral", /virus|viral|phage|capsid|virion/i],
  ["immunity", /immune|antibody|immunoglobulin|defen[sc]e|toxin|antigen/i],
  ["transport", /transport|channel|permease|pump|carrier|translocase/i],
  ["membrane", /membrane|transmembrane|lipid anchor/i],
  ["signalling", /receptor|signal|kinase|phosphatase|hormone|growth factor/i],
  ["genome", /dna|chromatin|replication|repair|recombination|helicase|topoisomerase/i],
  ["expression", /ribosom|translation|trna|rrna|rna polymerase|aminoacyl/i],
  ["structure", /structural|cytoskeleton|collagen|keratin|actin|tubulin|scaffold/i],
  ["regulation", /regulat|transcription factor|repressor|activator|modulator/i],
  ["metabolism", /metabolic|biosynth|catabolic|dehydrogenase|oxidase|reductase|transferase/i],
  ["catalysis", /enzyme|ase\b|cataly/i],
];

function hash32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function clean(value, max = 120) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function classify(name, family, organism) {
  const haystack = `${name} ${family} ${organism}`;
  return regionRules.find(([, rule]) => rule.test(haystack))?.[0] ?? "unresolved";
}

function familyName(name, families) {
  const family = clean(families.split(/[.;]/)[0], 72);
  if (family) return family;
  return clean(name.replace(/\([^)]*\)/g, "").replace(/\bprotein\b/gi, "").trim(), 72) || "Uncharacterized proteins";
}

function spatialize(accession, family, regionId, length) {
  const region = regions.find((candidate) => candidate.id === regionId) ?? regions.at(-1);
  const familyHash = hash32(family.toLowerCase());
  const familyRandom = randomUnit(familyHash);
  const phi = familyRandom() * Math.PI * 2;
  const radius = 13 + familyRandom() * 23;
  const vertical = (familyRandom() - 0.5) * 25;
  const familyCenter = [
    region.center[0] + Math.cos(phi) * radius,
    region.center[1] + vertical,
    region.center[2] + Math.sin(phi) * radius,
  ];
  const pointRandom = randomUnit(hash32(accession));
  const spread = 1.8 + Math.min(8, Math.log2(Math.max(16, length)) * 0.48);
  const theta = pointRandom() * Math.PI * 2;
  const u = pointRandom() * 2 - 1;
  const radial = Math.cbrt(pointRandom()) * spread;
  const planar = Math.sqrt(1 - u * u);
  return [
    familyCenter[0] + Math.cos(theta) * planar * radial,
    familyCenter[1] + u * radial,
    familyCenter[2] + Math.sin(theta) * planar * radial,
  ].map((value) => Number(value.toFixed(3)));
}

async function sourceLines() {
  if (args.input) {
    const stream = Readable.toWeb((await import("node:fs")).createReadStream(path.resolve(args.input)));
    return { lines: createInterface({ input: Readable.fromWeb(stream), crlfDelay: Infinity }), headers: new Headers() };
  }
  const response = await fetch(sourceUrl, { headers: { "User-Agent": "Helicase-Atlas/0.2 (Build Week scientific indexer)" } });
  if (!response.ok || !response.body) throw new Error(`UniProt request failed: ${response.status} ${response.statusText}`);
  return { lines: createInterface({ input: Readable.fromWeb(response.body), crlfDelay: Infinity }), headers: response.headers };
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(path.join(outputRoot, "shards"), { recursive: true });

const shards = Array.from({ length: shardCount }, () => []);
const clusterStats = new Map();
const regionStats = new Map(regions.map((region) => [region.id, 0]));
const { lines, headers } = await sourceLines();
let headersSeen = false;
let count = 0;
let pdbCount = 0;
let predictedCount = 0;

for await (const line of lines) {
  if (!headersSeen) {
    headersSeen = true;
    continue;
  }
  if (!line.trim()) continue;
  const [accessionRaw, entryRaw, nameRaw, organismRaw, taxonomyRaw, lengthRaw, familiesRaw = "", pdbRaw = ""] = line.split("\t");
  const accession = clean(accessionRaw, 24);
  if (!accession) continue;
  // UniProt's protein_name field concatenates the recommended name with every
  // alternative name in parens; well-annotated entries routinely exceed 128
  // characters (e.g. MID2's recommended + 3 alternative names). The previous
  // 128-char cap silently cut names mid-word with no truncation indicator —
  // raised to 320, matching the schema bound in src/domain/schemas.ts.
  const name = clean(nameRaw, 320);
  const organism = clean(organismRaw, 92);
  const family = familyName(name, familiesRaw);
  const length = Number(lengthRaw) || 0;
  const region = classify(name, family, organism);
  const position = spatialize(accession, family, region, length);
  const familyHash = hash32(family.toLowerCase());
  const clusterId = `${region}-${familyHash.toString(36)}`;
  const shard = familyHash % shardCount;
  const pdb = clean(pdbRaw.split(";")[0], 8) || null;
  const structure = pdb ? { kind: "experimental", accession: pdb, source: "RCSB PDB" } : { kind: "predicted", accession, source: "AlphaFold DB" };
  if (pdb) pdbCount += 1; else predictedCount += 1;
  const record = {
    id: accession,
    entry: clean(entryRaw, 32),
    name,
    organism,
    taxonomyId: Number(taxonomyRaw) || null,
    length,
    family,
    region,
    cluster: clusterId,
    position,
    structure,
  };
  shards[shard].push(record);
  regionStats.set(region, (regionStats.get(region) ?? 0) + 1);
  const cluster = clusterStats.get(clusterId) ?? { id: clusterId, label: family, region, count: 0, center: [0, 0, 0], shard };
  cluster.count += 1;
  cluster.center[0] += position[0];
  cluster.center[1] += position[1];
  cluster.center[2] += position[2];
  clusterStats.set(clusterId, cluster);
  count += 1;
  if (count % 25000 === 0) process.stdout.write(`Indexed ${count.toLocaleString()} proteins\n`);
  if (limit > 0 && count >= limit) break;
}

const clusters = [...clusterStats.values()].map((cluster) => ({
  ...cluster,
  center: cluster.center.map((value) => Number((value / cluster.count).toFixed(3))),
})).sort((a, b) => b.count - a.count);

const shardManifest = [];
for (let index = 0; index < shards.length; index += 1) {
  const records = shards[index];
  const id = index.toString(16).padStart(2, "0");
  const payload = JSON.stringify({ schema: "helicase.atlas.shard.v1", id, records });
  await fs.writeFile(path.join(outputRoot, "shards", `${id}.json`), payload);
  shardManifest.push({ id, count: records.length, bytes: Buffer.byteLength(payload), href: `/data/atlas/shards/${id}.json` });
}

const manifest = {
  schema: "helicase.atlas.manifest.v1",
  generatedAt: new Date().toISOString(),
  source: {
    name: "UniProtKB/Swiss-Prot",
    query: "reviewed:true",
    url: sourceUrl,
    release: headers.get("x-uniprot-release") ?? "unknown",
    releaseDate: headers.get("x-uniprot-release-date") ?? "unknown",
    license: "UniProt terms; attribution required",
  },
  spatialization: {
    method: "deterministic annotation-family hierarchy v1",
    semantics: "Region from annotation keywords; family proximity from UniProt protein-family annotation; accession-seeded local spread.",
    structuralSimilarity: false,
    caveat: "Spatial proximity encodes annotation-family similarity, not measured structural distance or sequence embedding distance.",
  },
  coverage: {
    records: count,
    experimentalStructures: pdbCount,
    predictedStructureReferences: predictedCount,
    completeSourceQuery: !args.input && limit === 0,
    requestedLimit: limit || null,
  },
  regions: regions.map((region) => ({ ...region, count: regionStats.get(region.id) ?? 0 })),
  clusters,
  shards: shardManifest,
};

await fs.writeFile(path.join(outputRoot, "manifest.json"), JSON.stringify(manifest));
await fs.writeFile(path.join(outputRoot, "BUILD_REPORT.json"), JSON.stringify({
  generatedAt: manifest.generatedAt,
  records: count,
  clusters: clusters.length,
  shards: shardCount,
  bytes: shardManifest.reduce((sum, shard) => sum + shard.bytes, 0),
  sourceRelease: manifest.source.release,
  completeSourceQuery: manifest.coverage.completeSourceQuery,
  inputFixture: Boolean(args.input),
}, null, 2));

const summary = `Helicase Atlas index\n${count.toLocaleString()} proteins\n${clusters.length.toLocaleString()} annotation families\n${pdbCount.toLocaleString()} PDB-linked entries\n`;
await new Promise((resolve, reject) => {
  const stream = createWriteStream(path.join(outputRoot, "SUMMARY.txt"));
  stream.on("error", reject);
  stream.on("finish", resolve);
  stream.end(summary);
});
process.stdout.write(summary);
