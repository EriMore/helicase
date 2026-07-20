export const copilotTools = [
  { type: "function", name: "query_atlas", description: "Search indexed proteins and express the results spatially in the universe.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { query: { type: "string" } }, required: ["query"] } },
  { type: "function", name: "focus_region", description: "Navigate to a broad functional region of the protein universe.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { region_id: { type: "string", enum: ["catalysis", "transport", "signalling", "genome", "expression", "immunity", "structure", "metabolism", "membrane", "viral", "regulation", "unresolved"] } }, required: ["region_id"] } },
  { type: "function", name: "design_binder", description: "Launch the verified precomputed design playback for an available site.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { target_site: { type: "string" }, specification: { type: "string" } }, required: ["target_site", "specification"] } },
  { type: "function", name: "color_by", description: "Apply an evidence-aware coloring scheme to the active structure.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { scheme: { type: "string", enum: ["confidence", "trusted_core", "hydrophobicity"] } }, required: ["scheme"] } },
  { type: "function", name: "fly_to_protein", description: "Navigate to a protein in the atlas.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { protein_id: { type: "string" } }, required: ["protein_id"] } },
  { type: "function", name: "return_to_universe", description: "Leave structure inspection and return to the preserved universe camera context.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
] as const;

export type CopilotToolCall = { name: string; arguments: Record<string, string> };
