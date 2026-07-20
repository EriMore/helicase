import { describe, expect, it } from "vitest";
import { atlasProteinSchema, confidenceDatasetSchema, designTrajectorySchema } from "./schemas";

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
});
