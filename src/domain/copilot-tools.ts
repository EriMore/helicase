export const copilotTools = [
  { type: "function", name: "design_binder", description: "Launch the verified precomputed design playback for an available site.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { target_site: { type: "string" }, specification: { type: "string" } }, required: ["target_site", "specification"] } },
  { type: "function", name: "color_by", description: "Apply an evidence-aware coloring scheme to the active structure.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { scheme: { type: "string", enum: ["confidence", "trusted_core", "hydrophobicity"] } }, required: ["scheme"] } },
  { type: "function", name: "fly_to_protein", description: "Navigate to a protein in the atlas.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { protein_id: { type: "string" } }, required: ["protein_id"] } },
] as const;

export type CopilotToolCall = { name: string; arguments: Record<string, string> };
