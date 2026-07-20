import { NextResponse } from "next/server";
import { structureMetadataSchema } from "@/domain/schemas";

type RcsbEntry = { rcsb_entry_container_identifiers?: { polymer_entity_ids?: string[] } };
type RcsbEntity = {
  entity_poly?: { pdbx_strand_id?: string };
  rcsb_polymer_entity?: { pdbx_description?: string };
  rcsb_polymer_entity_container_identifiers?: { reference_sequence_identifiers?: Array<{ database_name?: string; database_accession?: string; entity_sequence_coverage?: number; reference_sequence_coverage?: number; provenance_source?: string }> };
  rcsb_polymer_entity_align?: Array<{ provenance_source?: string; reference_database_name?: string; reference_database_accession?: string; aligned_regions?: Array<{ entity_beg_seq_id?: number; ref_beg_seq_id?: number; length?: number }> }>;
};

export async function GET(request: Request) {
  const accession = new URL(request.url).searchParams.get("accession")?.trim().toUpperCase();
  if (!accession || !/^[0-9][A-Z0-9]{3}$/.test(accession)) return NextResponse.json({ error: "A valid four-character PDB accession is required." }, { status: 400 });
  const sourceUrl = `https://data.rcsb.org/rest/v1/core/entry/${accession}`;
  try {
    const entryResponse = await fetch(sourceUrl, { signal: request.signal, next: { revalidate: 86_400 } });
    if (!entryResponse.ok) return NextResponse.json({ error: "RCSB structure metadata was not found." }, { status: entryResponse.status === 404 ? 404 : 502 });
    const entry = await entryResponse.json() as RcsbEntry;
    const entities = await Promise.all((entry.rcsb_entry_container_identifiers?.polymer_entity_ids ?? []).map(async (entityId) => {
      const response = await fetch(`https://data.rcsb.org/rest/v1/core/polymer_entity/${accession}/${entityId}`, { signal: request.signal, next: { revalidate: 86_400 } });
      if (!response.ok) throw new Error(`RCSB polymer entity ${entityId} returned ${response.status}`);
      return [entityId, await response.json() as RcsbEntity] as const;
    }));
    const chains = entities.flatMap(([entityId, entity]) => {
      const reference = entity.rcsb_polymer_entity_container_identifiers?.reference_sequence_identifiers?.find((candidate) => candidate.database_name === "UniProt") ?? null;
      const alignment = entity.rcsb_polymer_entity_align?.find((candidate) => candidate.reference_database_name === "UniProt" && candidate.reference_database_accession === reference?.database_accession) ?? null;
      return (entity.entity_poly?.pdbx_strand_id ?? "").split(",").map((id) => id.trim()).filter(Boolean).map((id) => ({
        id, entityId, description: entity.rcsb_polymer_entity?.pdbx_description ?? "Polymer entity", uniprotAccession: reference?.database_accession ?? null,
        entitySequenceCoverage: reference?.entity_sequence_coverage ?? null, referenceSequenceCoverage: reference?.reference_sequence_coverage ?? null,
        alignments: (alignment?.aligned_regions ?? []).flatMap((region) => region.entity_beg_seq_id && region.ref_beg_seq_id && region.length ? [{ entityStart: region.entity_beg_seq_id, referenceStart: region.ref_beg_seq_id, length: region.length, provenance: alignment?.provenance_source ?? reference?.provenance_source ?? "RCSB" }] : []),
      }));
    });
    return NextResponse.json(structureMetadataSchema.parse({ schema: "helicase.structure.metadata.v1", structure: { kind: "experimental", accession, source: "RCSB PDB" }, sourceUrl, retrievedAt: new Date().toISOString(), chains,
      limitations: ["Coverage and residue mappings are supplied by RCSB/SIFTS and may omit unresolved residues, engineered residues, insertion codes, ligands, or non-UniProt polymer entities."] }), { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ error: "RCSB structure metadata is temporarily unavailable.", detail: error instanceof Error ? error.message : "Unknown upstream error", retryable: true }, { status: 503 });
  }
}
