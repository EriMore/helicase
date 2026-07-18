# Data Architecture

## Canonical entities

### Protein

Stable ID, display name, source, sequence length, embedding coordinates, family label, structure references, annotation references, and available design sites.

### StructureContext

Structure source, accession, confidence summary, low-confidence ranges, secondary-structure summary, domains, ligands, function annotation, and citations.

### DesignTrajectory

Target site, specification, provenance, pipeline stages, ordered frames, final sequence, predicted scores, and an explicit `predicted_not_validated` status.

### Tour

Stable tour ID, title, opening state, ordered commands, narration, and expected visual checkpoints.

## Fixture strategy

Start with a deliberately curated subset that is visually diverse, scientifically legible, and capable of supporting the demo. The map may imply scale, but its records must declare the subset size and selection method.

Trajectory files must be real precomputed outputs or clearly marked development fixtures. Never label an interpolation or mock score as a scientific result.

## Provenance

Every externally sourced record needs source, accession, retrieval date, and citation metadata. Every predicted value needs model/pipeline and version metadata where available.

## Evolution

Keep fixtures versioned and schema-tagged. A later database or object store can replace JSON without changing the domain contracts.
