import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { atlasProteinSchema, confidenceDatasetSchema, designTrajectorySchema } from "./schemas";
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
});
