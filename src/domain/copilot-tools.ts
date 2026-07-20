import { z } from "zod";

const regionIds = ["catalysis", "transport", "signalling", "genome", "expression", "immunity", "structure", "metabolism", "membrane", "viral", "regulation", "unresolved"] as const;

export const copilotToolArgumentSchemas = {
  query_atlas: z.object({ query: z.string().trim().min(1).max(240) }).strict(),
  focus_region: z.object({ region_id: z.enum(regionIds) }).strict(),
  fly_to_protein: z.object({ protein_id: z.string().trim().min(1).max(40) }).strict(),
  color_by: z.object({ scheme: z.enum(["confidence", "trusted_core", "hydrophobicity"]) }).strict(),
  focus_confidence_range: z.object({ band: z.enum(["very_high", "confident", "low", "very_low"]) }).strict(),
  start_design_journey: z.object({ trajectory_id: z.literal("proteinmpnn-6ehb-example-6") }).strict(),
  set_design_stage: z.object({ stage_index: z.number().int().min(0).max(2) }).strict(),
  select_design_candidate: z.object({ candidate_id: z.enum(["6ehb-sample-1", "6ehb-sample-2"]) }).strict(),
  return_to_universe: z.object({}).strict(),
} as const;

type ToolName = keyof typeof copilotToolArgumentSchemas;
export type CopilotToolCall = { [Name in ToolName]: { name: Name; arguments: z.infer<(typeof copilotToolArgumentSchemas)[Name]> } }[ToolName];

const objectSchema = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", additionalProperties: false, properties, required });

export const copilotTools = [
  { type: "function", name: "query_atlas", description: "Search reviewed proteins and express results spatially.", strict: true, parameters: objectSchema({ query: { type: "string" } }, ["query"]) },
  { type: "function", name: "focus_region", description: "Navigate to a functional Atlas region.", strict: true, parameters: objectSchema({ region_id: { type: "string", enum: regionIds } }, ["region_id"]) },
  { type: "function", name: "fly_to_protein", description: "Navigate to an exact protein accession already present in scene context.", strict: true, parameters: objectSchema({ protein_id: { type: "string" } }, ["protein_id"]) },
  { type: "function", name: "color_by", description: "Apply an evidence-aware structure coloring scheme.", strict: true, parameters: objectSchema({ scheme: { type: "string", enum: ["confidence", "trusted_core", "hydrophobicity"] } }, ["scheme"]) },
  { type: "function", name: "focus_confidence_range", description: "Focus a verified AlphaFold pLDDT band on the active predicted structure.", strict: true, parameters: objectSchema({ band: { type: "string", enum: ["very_high", "confident", "low", "very_low"] } }, ["band"]) },
  { type: "function", name: "start_design_journey", description: "Start the attributable precomputed ProteinMPNN 6EHB sequence-redesign journey; this is not binder generation.", strict: true, parameters: objectSchema({ trajectory_id: { type: "string", enum: ["proteinmpnn-6ehb-example-6"] } }, ["trajectory_id"]) },
  { type: "function", name: "set_design_stage", description: "Move to a stage in the active design journey.", strict: true, parameters: objectSchema({ stage_index: { type: "number", minimum: 0, maximum: 2 } }, ["stage_index"]) },
  { type: "function", name: "select_design_candidate", description: "Select one attributable ProteinMPNN candidate in the active journey.", strict: true, parameters: objectSchema({ candidate_id: { type: "string", enum: ["6ehb-sample-1", "6ehb-sample-2"] } }, ["candidate_id"]) },
  { type: "function", name: "return_to_universe", description: "Return to the preserved universe camera context.", strict: true, parameters: objectSchema({}, []) },
] as const;

export function parseCopilotToolCall(name: string, args: unknown): CopilotToolCall | null {
  const schema = copilotToolArgumentSchemas[name as ToolName];
  if (!schema) return null;
  const parsed = schema.safeParse(args);
  return parsed.success ? { name, arguments: parsed.data } as CopilotToolCall : null;
}
