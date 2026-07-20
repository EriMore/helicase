import type { AtlasProtein } from "./atlas-data";

export const ATLAS_PROJECTION_VERSION = "annotation-family-hierarchy-v1";

export const atlasRegions = [
  ["catalysis", [0, 0, 0]], ["transport", [78, 18, -38]], ["signalling", [-72, 28, -34]],
  ["genome", [24, -58, 62]], ["expression", [-34, -62, 48]], ["immunity", [62, 54, 48]],
  ["structure", [-66, 48, 52]], ["metabolism", [18, 62, -68]], ["membrane", [-18, 4, -86]],
  ["viral", [72, -52, -8]], ["regulation", [-76, -24, -46]], ["unresolved", [4, -8, 92]],
] as const;

const regionRules: Array<[string, RegExp]> = [
  ["viral", /virus|viral|phage|capsid|virion/i], ["immunity", /immune|antibody|immunoglobulin|defen[sc]e|toxin|antigen/i],
  ["transport", /transport|channel|permease|pump|carrier|translocase/i], ["membrane", /membrane|transmembrane|lipid anchor/i],
  ["signalling", /receptor|signal|kinase|phosphatase|hormone|growth factor/i],
  ["genome", /dna|chromatin|replication|repair|recombination|helicase|topoisomerase/i],
  ["expression", /ribosom|translation|trna|rrna|rna polymerase|aminoacyl/i],
  ["structure", /structural|cytoskeleton|collagen|keratin|actin|tubulin|scaffold/i],
  ["regulation", /regulat|transcription factor|repressor|activator|modulator/i],
  ["metabolism", /metabolic|biosynth|catabolic|dehydrogenase|oxidase|reductase|transferase/i],
  ["catalysis", /enzyme|ase\b|cataly/i],
];

export function hash32(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function randomUnit(seed: number) {
  let value = seed >>> 0;
  return () => { value += 0x6d2b79f5; let next = value; next = Math.imul(next ^ (next >>> 15), next | 1); next ^= next + Math.imul(next ^ (next >>> 7), next | 61); return ((next ^ (next >>> 14)) >>> 0) / 4294967296; };
}

export function classifyProtein(name: string, family: string, organism: string) {
  const haystack = `${name} ${family} ${organism}`;
  return regionRules.find(([, rule]) => rule.test(haystack))?.[0] ?? "unresolved";
}

export function spatializeProtein(accession: string, family: string, regionId: string, length: number): [number, number, number] {
  const region = atlasRegions.find(([id]) => id === regionId) ?? atlasRegions.at(-1)!;
  const familyHash = hash32(family.toLowerCase());
  const familyRandom = randomUnit(familyHash);
  const phi = familyRandom() * Math.PI * 2;
  const radius = 13 + familyRandom() * 23;
  const vertical = (familyRandom() - 0.5) * 25;
  const center = [region[1][0] + Math.cos(phi) * radius, region[1][1] + vertical, region[1][2] + Math.sin(phi) * radius];
  const random = randomUnit(hash32(accession));
  const spread = 1.8 + Math.min(8, Math.log2(Math.max(16, length)) * 0.48);
  const theta = random() * Math.PI * 2;
  const u = random() * 2 - 1;
  const radial = Math.cbrt(random()) * spread;
  const planar = Math.sqrt(1 - u * u);
  return [center[0] + Math.cos(theta) * planar * radial, center[1] + u * radial, center[2] + Math.sin(theta) * planar * radial].map((value) => Number(value.toFixed(3))) as [number, number, number];
}

export function explainProximity(a: AtlasProtein, b: AtlasProtein) {
  const signals = [
    a.region === b.region ? { kind: "annotation-region", label: a.region, source: ATLAS_PROJECTION_VERSION } : null,
    a.family === b.family ? { kind: "uniprot-family", label: a.family, source: "UniProtKB protein-family annotation" } : null,
    a.organism === b.organism ? { kind: "organism", label: a.organism, source: "UniProtKB organism annotation" } : null,
  ].filter(Boolean);
  return { signals, caveat: "This baseline projection does not encode learned sequence or measured structural distance." };
}
