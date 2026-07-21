import { describe, expect, it } from "vitest";
import { computeRelationshipThreads, computeThreadEndpoints } from "./relationships";
import { worldPosition } from "./territories";
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

describe("computeThreadEndpoints", () => {
  // The correctness gate: a thread must never emanate from or terminate at
  // empty space. Both endpoints must be the real, scaled world-space position
  // of the actual selected/related protein — never a stale, approximate, or
  // unscaled coordinate — because WorldCanvas renders every point (including
  // the petri dish and query/selection markers) through worldPosition().
  it("anchors both endpoints to the real worldPosition() of the selected and related proteins", () => {
    const selected = makeProtein({ id: "P1", family: "Globin family", position: [10, -4, 2] });
    const related = makeProtein({ id: "P2", family: "Globin family", position: [-8, 6, 1.5] });
    const threads = computeRelationshipThreads(selected, [related], 3);
    const endpoints = computeThreadEndpoints(selected, threads);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].proteinId).toBe("P2");
    expect(endpoints[0].from).toEqual(worldPosition(selected.position));
    expect(endpoints[0].to).toEqual(worldPosition(related.position));
    // Never the raw, unscaled data-space coordinate.
    expect(endpoints[0].to).not.toEqual(related.position);
  });

  it("recomputes fresh endpoints per selection instead of reusing a stale position", () => {
    const proteinA = makeProtein({ id: "PA", family: "Globin family", position: [1, 1, 1] });
    const proteinB = makeProtein({ id: "PB", family: "Globin family", position: [2, 2, 2] });
    const related = makeProtein({ id: "PR", family: "Globin family", position: [9, 9, 9] });
    const threadsForA = computeRelationshipThreads(proteinA, [related], 3);
    const threadsForB = computeRelationshipThreads(proteinB, [related], 3);
    const endpointsForA = computeThreadEndpoints(proteinA, threadsForA);
    const endpointsForB = computeThreadEndpoints(proteinB, threadsForB);
    expect(endpointsForA[0].from).toEqual(worldPosition(proteinA.position));
    expect(endpointsForB[0].from).toEqual(worldPosition(proteinB.position));
    expect(endpointsForA[0].from).not.toEqual(endpointsForB[0].from);
  });
});
