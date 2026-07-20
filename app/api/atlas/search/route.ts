import { NextResponse } from "next/server";
import { corpusSearchRequestSchema, corpusSearchResponseSchema } from "@/domain/schemas";
import { classifyProtein, hash32, spatializeProtein } from "@/domain/spatialization";
import type { AtlasProtein } from "@/domain/atlas-data";

const fields = ["accession", "id", "protein_name", "organism_name", "organism_id", "length", "protein_families", "xref_pdb"];
const endpoint = "https://rest.uniprot.org/uniprotkb/search";
const clean = (value: string | undefined, maximum = 180) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
const familyName = (name: string, families: string) => clean(families.split(/[.;]/)[0], 120) || clean(name.replace(/\([^)]*\)/g, "").replace(/\bprotein\b/gi, ""), 120) || "Uncharacterized proteins";
const safeTerms = (query: string) => query.normalize("NFKC").match(/[\p{L}\p{N}][\p{L}\p{N}_.:-]*/gu)?.slice(0, 12) ?? [];

function parseCursor(link: string | null) {
  const next = link?.split(",").find((part) => /rel="next"/.test(part));
  const url = next?.match(/<([^>]+)>/)?.[1];
  const cursor = url ? new URL(url).searchParams.get("cursor") : null;
  return cursor && /^[A-Za-z0-9_-]+$/.test(cursor) ? cursor : null;
}

function parseRecords(tsv: string): AtlasProtein[] {
  const lines = tsv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  return lines.slice(1).flatMap((line) => {
    const [idRaw, entryRaw, nameRaw, organismRaw, taxonomyRaw, lengthRaw, familiesRaw = "", pdbRaw = ""] = line.split("\t");
    const id = clean(idRaw, 40); const name = clean(nameRaw, 256);
    if (!id || !name) return [];
    const organism = clean(organismRaw, 180); const family = familyName(name, familiesRaw); const length = Number(lengthRaw) || 0;
    const region = classifyProtein(name, family, organism); const familyHash = hash32(family.toLowerCase()); const pdb = clean(pdbRaw.split(";")[0], 12) || null;
    return [{ id, entry: clean(entryRaw, 64), name, organism, taxonomyId: Number(taxonomyRaw) || null, length, family, region,
      cluster: `${region}-${familyHash.toString(36)}`, position: spatializeProtein(id, family, region, length),
      structure: pdb ? { kind: "experimental" as const, accession: pdb, source: "RCSB PDB" as const } : { kind: "predicted" as const, accession: id, source: "AlphaFold DB" as const } }];
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = corpusSearchRequestSchema.safeParse({ query: url.searchParams.get("q") ?? "", cursor: url.searchParams.get("cursor") ?? undefined, size: Number(url.searchParams.get("size") ?? 40) });
  if (!parsed.success) return NextResponse.json({ error: "Invalid corpus query", details: parsed.error.flatten() }, { status: 400 });
  const terms = safeTerms(parsed.data.query);
  if (!terms.length) return NextResponse.json({ error: "The query contains no searchable terms." }, { status: 400 });
  const upstream = new URL(endpoint);
  upstream.searchParams.set("format", "tsv"); upstream.searchParams.set("query", `(reviewed:true) AND (${terms.map((term) => `(${term})`).join(" AND ")})`);
  upstream.searchParams.set("fields", fields.join(",")); upstream.searchParams.set("size", String(parsed.data.size));
  if (parsed.data.cursor) upstream.searchParams.set("cursor", parsed.data.cursor);
  try {
    const response = await fetch(upstream, { headers: { "User-Agent": "Helicase-Atlas/0.3 (scientific corpus navigator)", Accept: "text/tab-separated-values" }, signal: request.signal, next: { revalidate: 43_200 } });
    if (!response.ok) throw new Error(`UniProt returned ${response.status}`);
    const payload = corpusSearchResponseSchema.parse({ schema: "helicase.atlas.search.v1", query: parsed.data.query, scope: "complete-reviewed-corpus",
      source: { name: "UniProtKB/Swiss-Prot", release: response.headers.get("x-uniprot-release") ?? "unknown", url: upstream.toString() },
      records: parseRecords(await response.text()), totalResults: Number(response.headers.get("x-total-results")) || null,
      nextCursor: parseCursor(response.headers.get("link")), partial: false, warning: null });
    return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ error: "Complete-corpus search is temporarily unavailable.", code: "UPSTREAM_UNAVAILABLE", retryable: true, detail: error instanceof Error ? error.message : "Unknown upstream failure" }, { status: 503 });
  }
}
