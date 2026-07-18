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

The full build therefore runs through the manually dispatched GitHub Actions workflow, where the output is retained as an artifact and measured before selecting a live deployment derivative. No generated density field may be described as a protein corpus while the artifact is unavailable.

## Provenance

Every manifest records the UniProt query, release headers, generation timestamp, spatialization method, coverage completeness, and caveat. Every record retains its UniProt accession and structure source. AlphaFold predictions remain predictions; PDB cross-references remain experimental records. Missing values remain missing.
