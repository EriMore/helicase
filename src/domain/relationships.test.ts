import { describe, expect, it } from "vitest";
import { computeRelationshipThreads } from "./relationships";
import type { AtlasProtein } from "./atlas-data";

function makeProtein(overrides: Partial<AtlasProtein>): AtlasProtein {
  return {
    id: "P00000", entry: "P00000_TEST", name: "Test protein", organism: "Homo sapiens", taxonomyId: 9606,
    length: 100, family: "Globin family", region: "transport", cluster: "transport-1", position: [0, 0, 0],
    structure: { kind: "predicted", accession: "P00000", source: "AlphaFold DB" },
    ...overrides,
  };
}

describe("computeRelationshipThreads", () => {
  it("never includes the selected protein itself and caps at the limit", () => {
    const selected = makeProtein({ id: "P1", family: "Globin family" });
    const pool = Array.from({ length: 10 }, (_, index) => makeProtein({ id: `P${index + 2}`, family: "Globin family" }));
    const threads = computeRelationshipThreads(selected, [selected, ...pool], 3);
    expect(threads).toHaveLength(3);
    expect(threads.every((thread) => thread.protein.id !== "P1")).toBe(true);
  });

  it("ranks a real shared UniProt family annotation above coincidental region/organism overlap", () => {
    const selected = makeProtein({ id: "P1", family: "Globin family", region: "transport", organism: "Homo sapiens" });
    const sameFamily = makeProtein({ id: "P2", family: "Globin family", region: "metabolism", organism: "Mus musculus" });
    const sameRegionOnly = makeProtein({ id: "P3", family: "Unrelated family", region: "transport", organism: "Escherichia coli" });
    const threads = computeRelationshipThreads(selected, [sameRegionOnly, sameFamily], 3);
    expect(threads[0].protein.id).toBe("P2");
    expect(threads[0].type).toBe("Shared family");
    expect(threads[0].status).toBe("Annotated");
    expect(threads[1].protein.id).toBe("P3");
    expect(threads[1].type).toBe("Shared classification");
  });

  it("produces no threads when nothing shares a real signal", () => {
    const selected = makeProtein({ id: "P1", family: "Globin family", region: "transport", organism: "Homo sapiens" });
    const unrelated = makeProtein({ id: "P2", family: "Kinase family", region: "signalling", organism: "Danio rerio" });
    expect(computeRelationshipThreads(selected, [unrelated])).toHaveLength(0);
  });
});
