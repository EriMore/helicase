# Atlas Data Pipeline

## Target

The architectural target is the complete addressable protein universe, not a hand-curated constellation. AlphaFold DB currently reports more than 262 million predicted models; InterPro reports family matches across more than 167 million proteins. Atlas must be able to index those corpora without changing its browser contracts.

The first executable corpus is the complete `reviewed:true` UniProtKB/Swiss-Prot query. It provides stable accessions, names, organisms, lengths, protein-family annotations, and PDB cross-references. Predicted-structure references resolve by UniProt accession through AlphaFold DB; experimental structures use RCSB PDB accessions when present.

## Build path

`scripts/build-atlas.mjs` streams UniProt TSV, never loads coordinate structures during universe indexing, and emits:

- a versioned manifest with source release, coverage, regions, family clusters, and shard inventory;
- deterministic annotation-family spatial coordinates for every record;
- progressive JSON shards that can be fetched and indexed independently;
- a machine-readable build report with record, cluster, structure-reference, and byte counts.

The default build has no record limit. `--limit` exists only to produce a deployment-sized derivative after a complete run quantifies the source and output.

## Spatial semantics

The current projection is a deterministic annotation hierarchy, not a learned embedding:

1. UniProt name, family, and organism annotations assign one of twelve broad functional regions.
2. The normalized UniProt family annotation determines a stable family centre inside that region.
3. The stable UniProt accession determines local spread within the family neighbourhood.

Nearby records therefore share annotated function or family. The interface must call this an annotation-family map. It must not call the distance structural similarity or sequence-embedding distance. A later ESM/Foldseek projection can replace coordinates without changing protein IDs, shards, commands, or provenance.

## Multiscale delivery

- Universe scale renders region and family-cluster aggregates from the manifest.
- Region scale progressively loads the shards referenced by visible clusters.
- Protein scale renders individual records from loaded shards.
- Structure scale fetches one BinaryCIF or AlphaFold mmCIF only after selection.
- Search runs in a worker over progressively loaded records and may augment local results through the server-side UniProt adapter when network access exists.

The renderer never attempts to instantiate molecular geometry for universe entities.

## Full-scale attempt and current blocker

On 18 July 2026, direct requests to `rest.uniprot.org` were attempted from both the local shell and the application browser. Both failed before HTTP negotiation with `ERR_NAME_NOT_RESOLVED` / `Could not resolve host`. This is an environment DNS restriction, not an API, schema, memory, or rendering failure.

The full build therefore runs in GitHub Actions, where the output is retained as an artifact and measured before selecting a live deployment derivative. The first unrestricted run completed in 131 seconds and indexed 575,503 reviewed proteins, 55,558 annotation families, and 39,017 PDB-linked entries. Its static output measured 241 MB uncompressed and 38,661,970 bytes as a level-nine compressed artifact.

The live browser profile is a deterministic 75,000-record prefix of that same reviewed UniProt query: 19,451 annotation families, 22,429 PDB-linked records, 64 progressive shards, and 34 MB uncompressed. The measured 241 MB full payload would impose unnecessary initial transfer, parse, and browser-memory pressure for a static Build Week deployment. This derivative is therefore a delivery profile—not a hand-authored fixture—and it uses the same manifest, shard, provenance, search, rendering, and structure-resolution contracts as the full corpus.

## Provenance

Every manifest records the UniProt query, release headers, generation timestamp, spatialization method, coverage completeness, and caveat. Every record retains its UniProt accession and structure source. AlphaFold predictions remain predictions; PDB cross-references remain experimental records. Missing values remain missing.
