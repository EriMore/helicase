import { NextResponse } from "next/server";
import { proteinDetailSchema } from "@/domain/schemas";

type UniProtComment = { commentType?: string; texts?: Array<{ value?: string }>; note?: { texts?: Array<{ value?: string }> } };
type UniProtFeature = { type?: string; description?: string; location?: { start?: { value?: number }; end?: { value?: number } } };
type UniProtKeyword = { name?: string };
type UniProtEntry = {
  genes?: Array<{ geneName?: { value?: string } }>;
  comments?: UniProtComment[];
  features?: UniProtFeature[];
  keywords?: UniProtKeyword[];
  sequence?: { value?: string };
};

const fields = ["gene_names", "cc_function", "cc_subcellular_location", "cc_disease", "cc_pathway", "ft_domain", "ft_region", "sequence", "keyword"];

function commentText(entry: UniProtEntry, type: string): string | null {
  const matches = (entry.comments ?? []).filter((comment) => comment.commentType === type);
  if (!matches.length) return null;
  const parts = matches.flatMap((comment) => comment.texts?.map((text) => text.value).filter((value): value is string => Boolean(value)) ?? []);
  return parts.length ? parts.join(" ") : null;
}

function domainFeatures(entry: UniProtEntry) {
  return (entry.features ?? [])
    .filter((feature) => feature.type === "Domain" || feature.type === "Region")
    .flatMap((feature) => {
      const start = feature.location?.start?.value; const end = feature.location?.end?.value;
      if (!start || !end || !feature.description) return [];
      return [{ label: feature.description, start, end }];
    })
    .slice(0, 12);
}

export async function GET(request: Request) {
  const accession = new URL(request.url).searchParams.get("accession")?.trim().toUpperCase();
  if (!accession || !/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(accession)) return NextResponse.json({ error: "A valid UniProt accession is required." }, { status: 400 });
  const sourceUrl = `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(accession)}.json?fields=${fields.join(",")}`;
  try {
    const response = await fetch(sourceUrl, { signal: request.signal, next: { revalidate: 604_800 }, headers: { "User-Agent": "Helicase-Atlas/0.3 (scientific detail fetch)", Accept: "application/json" } });
    if (response.status === 404) return NextResponse.json({ error: "No reviewed UniProt entry exists for this accession." }, { status: 404 });
    if (!response.ok) throw new Error(`UniProt entry request returned ${response.status}`);
    const entry = await response.json() as UniProtEntry;
    const sequence = entry.sequence?.value ?? null;
    const functionFull = commentText(entry, "FUNCTION");
    const detail = proteinDetailSchema.parse({
      schema: "helicase.protein.detail.v1",
      accession,
      sourceUrl: `https://www.uniprot.org/uniprotkb/${accession}/entry`,
      retrievedAt: new Date().toISOString(),
      gene: entry.genes?.[0]?.geneName?.value ?? null,
      functionSummary: functionFull ? functionFull.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ") : null,
      functionFull,
      subcellularLocation: commentText(entry, "SUBCELLULAR LOCATION"),
      disease: commentText(entry, "DISEASE"),
      pathway: commentText(entry, "PATHWAY"),
      keywords: (entry.keywords ?? []).map((keyword) => keyword.name).filter((value): value is string => Boolean(value)).slice(0, 8),
      domains: domainFeatures(entry),
      sequence,
      references: [
        { label: `UniProtKB ${accession}`, url: `https://www.uniprot.org/uniprotkb/${accession}/entry` },
      ],
    });
    return NextResponse.json(detail, { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ error: "Protein detail could not be resolved from UniProt.", code: "DETAIL_UNAVAILABLE", retryable: true, detail: error instanceof Error ? error.message : "Unknown detail failure" }, { status: 503 });
  }
}
