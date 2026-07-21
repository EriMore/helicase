import { z } from "zod";
import { territories } from "./territories";

const territoryIds = territories.map((territory) => territory.id) as [string, ...string[]];

/**
 * The bounded, strongly-typed tool surface GPT-5.6 drives the SceneController through.
 * Every call is Zod-validated here (server) and again at the client boundary before
 * touching scene state — GPT can navigate, filter, and explain; it cannot invent
 * graph edges, fabricate structure, or bypass the same commands a human issues.
 */
export const copilotToolArgumentSchemas = {
  query_atlas: z.object({ query: z.string().trim().min(1).max(240) }).strict(),
  focus_territory: z.object({ territory_id: z.enum(territoryIds) }).strict(),
  select_protein: z.object({ protein_id: z.string().trim().min(1).max(40) }).strict(),
  inspect_structure: z.object({}).strict(),
  set_confidence_xray: z.object({ visible: z.boolean() }).strict(),
  reveal_threads: z.object({ visible: z.boolean() }).strict(),
  focus_residues: z.object({ start: z.number().int(), end: z.number().int(), chain: z.string().min(1).max(12).optional() }).strict(),
  start_design: z.object({ trajectory_id: z.literal("proteinmpnn-6ehb-example-6") }).strict(),
  return_to_universe: z.object({}).strict(),
} as const;

type ToolName = keyof typeof copilotToolArgumentSchemas;
export type CopilotToolCall = { [Name in ToolName]: { name: Name; arguments: z.infer<(typeof copilotToolArgumentSchemas)[Name]> } }[ToolName];

const objectSchema = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", additionalProperties: false, properties, required });

export const copilotTools = [
  { type: "function", name: "query_atlas", description: "Search reviewed proteins and express results spatially in the Universe.", strict: true, parameters: objectSchema({ query: { type: "string" } }, ["query"]) },
  { type: "function", name: "focus_territory", description: "Enter a functional cluster of the Atlas.", strict: true, parameters: objectSchema({ territory_id: { type: "string", enum: territoryIds } }, ["territory_id"]) },
  { type: "function", name: "select_protein", description: "Select an exact protein accession already present in scene context and open its identity panel (Glance).", strict: true, parameters: objectSchema({ protein_id: { type: "string" } }, ["protein_id"]) },
  { type: "function", name: "inspect_structure", description: "Mount the real Mol* structure viewport for the currently selected protein.", strict: true, parameters: objectSchema({}, []) },
  { type: "function", name: "set_confidence_xray", description: "Toggle verified per-residue AlphaFold pLDDT coloring. Only valid for predicted structures.", strict: true, parameters: objectSchema({ visible: { type: "boolean" } }, ["visible"]) },
  { type: "function", name: "reveal_threads", description: "Toggle the relationship threads for the currently selected protein. Threads come from real annotations or computed similarity; never invent one.", strict: true, parameters: objectSchema({ visible: { type: "boolean" } }, ["visible"]) },
  { type: "function", name: "focus_residues", description: "Focus the camera and highlight a residue range on the mounted structure.", strict: true, parameters: objectSchema({ start: { type: "number" }, end: { type: "number" }, chain: { type: "string" } }, ["start", "end"]) },
  { type: "function", name: "start_design", description: "Start the attributable precomputed ProteinMPNN 6EHB sequence-redesign journey; this is not binder generation.", strict: true, parameters: objectSchema({ trajectory_id: { type: "string", enum: ["proteinmpnn-6ehb-example-6"] } }, ["trajectory_id"]) },
  { type: "function", name: "return_to_universe", description: "Return to the Universe and clear the current selection.", strict: true, parameters: objectSchema({}, []) },
] as const;

export function parseCopilotToolCall(name: string, args: unknown): CopilotToolCall | null {
  const schema = copilotToolArgumentSchemas[name as ToolName];
  if (!schema) return null;
  const parsed = schema.safeParse(args);
  return parsed.success ? { name, arguments: parsed.data } as CopilotToolCall : null;
}
