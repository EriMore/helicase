import { NextResponse } from "next/server";
import { confidenceDatasetSchema } from "@/domain/schemas";

type AlphaFoldMetadata = {
  modelEntityId?: string; latestVersion?: number; chainId?: string; sequence?: string; globalMetricValue?: number;
  plddtDocUrl?: string; paeDocUrl?: string; pdbUrl?: string;
};
type AlphaFoldConfidence = { residueNumber?: number[]; confidenceScore?: number[] };

function buildRanges(residues: Array<{ residueNumber: number; plddt: number }>, predicate: (score: number) => boolean) {
  const values = residues.filter((residue) => predicate(residue.plddt)).map((residue) => residue.residueNumber).sort((a, b) => a - b);
  const ranges: Array<[number, number]> = [];
  for (const value of values) {
    const previous = ranges.at(-1);
    if (previous && value === previous[1] + 1) previous[1] = value;
    else ranges.push([value, value]);
  }
  return ranges;
}

export async function GET(request: Request) {
  const accession = new URL(request.url).searchParams.get("accession")?.trim().toUpperCase();
  if (!accession || !/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(accession)) return NextResponse.json({ error: "A valid UniProt accession is required." }, { status: 400 });
  try {
    const metadataUrl = `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(accession)}`;
    const metadataResponse = await fetch(metadataUrl, { signal: request.signal, next: { revalidate: 86_400 }, headers: { "User-Agent": "Helicase-Atlas/0.3" } });
    if (metadataResponse.status === 404) return NextResponse.json({ state: "unavailable", accession, reason: "No AlphaFold DB prediction is available for this accession." }, { status: 404 });
    if (!metadataResponse.ok) throw new Error(`AlphaFold metadata returned ${metadataResponse.status}`);
    const metadata = (await metadataResponse.json() as AlphaFoldMetadata[])[0];
    if (!metadata?.plddtDocUrl || !metadata.modelEntityId || !metadata.latestVersion) throw new Error("AlphaFold metadata omitted confidence provenance fields");
    const confidenceResponse = await fetch(metadata.plddtDocUrl, { signal: request.signal, next: { revalidate: 86_400 }, headers: { "User-Agent": "Helicase-Atlas/0.3" } });
    if (!confidenceResponse.ok) throw new Error(`AlphaFold confidence artifact returned ${confidenceResponse.status}`);
    const raw = await confidenceResponse.json() as AlphaFoldConfidence;
    if (!raw.residueNumber || !raw.confidenceScore || raw.residueNumber.length !== raw.confidenceScore.length || raw.residueNumber.length === 0) throw new Error("AlphaFold confidence arrays are missing or mismatched");
    const sequence = metadata.sequence ?? "";
    const residues = raw.residueNumber.map((residueNumber, index) => ({
      chain: metadata.chainId ?? "A", residueNumber, insertionCode: "", residueName: sequence[index] ?? "X", plddt: raw.confidenceScore![index],
    }));
    const mean = metadata.globalMetricValue ?? residues.reduce((sum, residue) => sum + residue.plddt, 0) / residues.length;
    const dataset = confidenceDatasetSchema.parse({
      schema: "helicase.confidence.plddt.v1", metric: "pLDDT", accession, modelId: metadata.modelEntityId,
      modelVersion: String(metadata.latestVersion), source: "AlphaFold DB", sourceUrl: metadata.plddtDocUrl,
      retrievedAt: new Date().toISOString(), mean, residues,
      ranges: {
        veryHigh: buildRanges(residues, (score) => score > 90), confident: buildRanges(residues, (score) => score > 70 && score <= 90),
        low: buildRanges(residues, (score) => score > 50 && score <= 70), veryLow: buildRanges(residues, (score) => score <= 50),
      },
      paeUrl: metadata.paeDocUrl ?? null,
      limitations: ["pLDDT estimates local model confidence, not experimental accuracy.", "pLDDT alone does not validate relative domain placement or molecular interfaces."],
    });
    return NextResponse.json(dataset, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ error: "AlphaFold confidence could not be verified.", code: "CONFIDENCE_UNAVAILABLE", retryable: true, detail: error instanceof Error ? error.message : "Unknown confidence failure" }, { status: 503 });
  }
}
