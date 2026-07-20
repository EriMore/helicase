import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { atlasProteinSchema, atlasWorkerMessageSchema, confidenceDatasetSchema, copilotStreamEventSchema, designTrajectorySchema, sceneCommandSchema, structureMetadataSchema } from "./schemas";
import { parseCopilotToolCall } from "./copilot-tools";

describe("scientific runtime schemas", () => {
  it("rejects confidence outside the pLDDT scale", () => {
    const parsed = confidenceDatasetSchema.safeParse({ schema: "helicase.confidence.plddt.v1", metric: "pLDDT", accession: "P12345", modelId: "AF-P12345-F1", modelVersion: "6", source: "AlphaFold DB", sourceUrl: "https://example.test/model.pdb", retrievedAt: new Date().toISOString(), mean: 101, residues: [], ranges: { veryHigh: [], confident: [], low: [], veryLow: [] }, paeUrl: null, limitations: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a protein with a non-finite spatial address", () => {
    const parsed = atlasProteinSchema.safeParse({ id: "P1", entry: "P1_HUMAN", name: "Protein", organism: "Human", taxonomyId: 9606, length: 10, family: "Family", region: "catalysis", cluster: "c1", position: [0, Number.NaN, 1], structure: { kind: "predicted", accession: "P1", source: "AlphaFold DB" } });
    expect(parsed.success).toBe(false);
  });

  it("requires design journeys to identify precomputed evidence", () => {
    expect(designTrajectorySchema.safeParse({ schema: "helicase.design.trajectory.v1", precomputed: false }).success).toBe(false);
  });

  it("validates the shipped ProteinMPNN 6EHB trajectory", () => {
    const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/design/proteinmpnn-6ehb.json"), "utf8"));
    const trajectory = designTrajectorySchema.parse(fixture);
    expect(trajectory.targetStructureId).toBe("6EHB");
    expect(trajectory.stages[1].candidates).toHaveLength(2);
    expect(trajectory.stages[2].provenance.outputIdentity).toBe("Validation unavailable");
  });

  it("rejects unbounded copilot tool arguments", () => {
    expect(parseCopilotToolCall("set_design_stage", { stage_index: 99 })).toBeNull();
    expect(parseCopilotToolCall("query_atlas", { query: "kinase", injected: true })).toBeNull();
    expect(parseCopilotToolCall("return_to_universe", {})).toEqual({ name: "return_to_universe", arguments: {} });
  });

  it("rejects malformed scene commands before reducer execution", () => {
    expect(sceneCommandSchema.safeParse({ type: "FOCUS_RESIDUES", start: 1, end: 20, requestId: 1, injected: true }).success).toBe(false);
    expect(sceneCommandSchema.safeParse({ type: "SET_REPRESENTATION", representation: "wireframe" }).success).toBe(false);
  });

  it("validates provenance-bearing RCSB/SIFTS coverage", () => {
    const parsed = structureMetadataSchema.parse({ schema: "helicase.structure.metadata.v1", structure: { kind: "experimental", accession: "6EHB", source: "RCSB PDB" }, sourceUrl: "https://data.rcsb.org/rest/v1/core/entry/6EHB", retrievedAt: "2026-07-20T00:00:00Z", chains: [{ id: "A", entityId: "1", description: "Outer membrane protein U", uniprotAccession: "A5F934", entitySequenceCoverage: 1, referenceSequenceCoverage: 0.9384, alignments: [{ entityStart: 1, referenceStart: 22, length: 320, provenance: "SIFTS" }] }], limitations: [] });
    expect(parsed.chains[0].alignments[0].referenceStart).toBe(22);
  });

  it("isolates malformed worker messages", () => {
    expect(atlasWorkerMessageSchema.safeParse({ type: "RESULTS", requestId: 4, results: [{ id: "P1", score: Number.NaN, matchedBy: ["identifier"] }] }).success).toBe(false);
    expect(atlasWorkerMessageSchema.safeParse({ type: "INDEX_SIZE", count: 75_000 }).success).toBe(true);
  });

  it("validates streamed copilot events before execution", () => {
    expect(copilotStreamEventSchema.safeParse({ type: "tool_call", call: { name: "return_to_universe", arguments: {} } }).success).toBe(true);
    expect(copilotStreamEventSchema.safeParse({ type: "tool_call", call: { name: "return_to_universe", arguments: {}, injected: true } }).success).toBe(false);
  });
});
