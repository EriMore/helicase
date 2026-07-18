# API Strategy

## Copilot contract

The server accepts the current scene context, selected protein context, conversation input, and a bounded tool schema. It returns streamed text plus validated tool calls.

GPT must be instructed to:

- ground claims in supplied context;
- distinguish fact, prediction, and hypothesis;
- use tools to show or make rather than merely describe;
- disclose when a design is precomputed;
- state that predicted binding scores are not wet-lab validation.

## Tool surface

The initial maximum is seven tools:

1. `design_binder(target_site, specification)`
2. `focus_residues(residue_ids)`
3. `highlight_domain(domain_name)`
4. `set_representation(style)`
5. `color_by(scheme)`
6. `compare_to(protein_id)`
7. `fly_to_protein(protein_id)`

All arguments are schema-validated before dispatch. Unknown tools, malformed arguments, and unavailable targets produce recoverable errors.

## External data

Use RCSB PDB, PDBe, AlphaFold DB, UniProt, and optional domain providers behind server-side adapters. Cache aggressively and preserve citations.

## Security and privacy

API credentials stay server-side. User text is treated as untrusted input. The client does not receive arbitrary server execution capability through tools.
