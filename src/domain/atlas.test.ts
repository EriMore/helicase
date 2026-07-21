import { describe, expect, it } from "vitest";
import { initialSceneState, reduceScene } from "./atlas";

describe("SceneController reducer", () => {
  it("normalizes residue ranges and keeps structure controls in scene state", () => {
    const focused = reduceScene(initialSceneState, { type: "FOCUS_RESIDUES", start: 82, end: 14, chain: "A", requestId: 9 });
    expect(focused.residueFocus).toEqual({ start: 14, end: 82, chain: "A", requestId: 9 });
    const represented = reduceScene(focused, { type: "SET_REPRESENTATION", representation: "surface" });
    expect(represented.structureRepresentation).toBe("surface");
  });

  it("restores structure defaults when a new protein is selected", () => {
    const customized = { ...initialSceneState, structureRepresentation: "ball-and-stick" as const, ligandsVisible: false, residueFocus: { start: 1, end: 10, requestId: 1 } };
    const selected = reduceScene(customized, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    expect(selected).toMatchObject({ mode: "glance", selectedProteinId: "P69905", structureRepresentation: "cartoon", ligandsVisible: true, residueFocus: null });
  });

  it("walks the 5-level hierarchy: universe -> territory -> glance -> inspect -> design", () => {
    let state = initialSceneState;
    state = reduceScene(state, { type: "ENTER_TERRITORY", territoryId: "catalysis-metabolism" });
    expect(state.mode).toBe("territory");
    state = reduceScene(state, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    expect(state.mode).toBe("glance");
    state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
    expect(state.mode).toBe("inspect");
    state = reduceScene(state, { type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "test" });
    expect(state.mode).toBe("design");
    expect(state.design?.playback).toBe("playing");
  });

  it("returns one level at a time, preferring territory over universe when one is active", () => {
    let state = reduceScene(initialSceneState, { type: "ENTER_TERRITORY", territoryId: "catalysis-metabolism" });
    state = reduceScene(state, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("glance");
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("territory");
    expect(state.territoryId).toBe("catalysis-metabolism");
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("universe");
    expect(state.territoryId).toBeNull();
  });

  it("returns directly to glance from a protein selected without a territory", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    expect(state.territoryId).toBeNull();
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("universe");
  });

  it("exits the design journey back to inspect, not glance", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "A5F934" });
    state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
    state = reduceScene(state, { type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "test" });
    state = reduceScene(state, { type: "SEEK_DESIGN", progress: 0.6 });
    expect(state.design?.progress).toBeCloseTo(0.6);
    state = reduceScene(state, { type: "EXIT_DESIGN" });
    expect(state.mode).toBe("inspect");
    expect(state.design).toBeNull();
  });

  it("clamps continuous design progress to [0,1]", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "A5F934" });
    state = reduceScene(state, { type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "test" });
    state = reduceScene(state, { type: "SEEK_DESIGN", progress: 4 });
    expect(state.design?.progress).toBe(1);
    state = reduceScene(state, { type: "SEEK_DESIGN", progress: -4 });
    expect(state.design?.progress).toBe(0);
  });

  it("a NAV_TO_LEVEL jump to territory is rejected when no territory was ever entered", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    const before = state;
    state = reduceScene(state, { type: "NAV_TO_LEVEL", level: "territory" });
    expect(state).toBe(before);
  });

  describe("CLOSE_PROTEIN (identity panel close button)", () => {
    it("fully clears the protein state in one step from Inspect, unlike RETURN_ONE_LEVEL", () => {
      let state = reduceScene(initialSceneState, { type: "ENTER_TERRITORY", territoryId: "catalysis-metabolism" });
      state = reduceScene(state, { type: "SELECT_PROTEIN", proteinId: "P69905" });
      state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
      state = reduceScene(state, { type: "TOGGLE_THREADS" });
      state = reduceScene(state, { type: "OPEN_SEQUENCE" });
      expect(state.mode).toBe("inspect");
      state = reduceScene(state, { type: "CLOSE_PROTEIN" });
      // A single CLOSE_PROTEIN from Inspect returns straight to the cluster (Territory),
      // not to Glance the way one RETURN_ONE_LEVEL step would.
      expect(state.mode).toBe("territory");
      expect(state.territoryId).toBe("catalysis-metabolism");
      expect(state.selectedProteinId).toBeNull();
      expect(state.threadsOn).toBe(false);
      expect(state.seqOpen).toBe(false);
      expect(state.design).toBeNull();
    });

    it("fully clears from Design in one step", () => {
      let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "A5F934" });
      state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
      state = reduceScene(state, { type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "test" });
      state = reduceScene(state, { type: "CLOSE_PROTEIN" });
      expect(state.mode).toBe("universe");
      expect(state.selectedProteinId).toBeNull();
      expect(state.design).toBeNull();
    });

    it("returns to Universe when the protein was not selected from a cluster, preserving the active query", () => {
      let state = reduceScene(initialSceneState, { type: "QUERY_ATLAS", query: "kinase", resultIds: ["P1", "P2"] });
      state = reduceScene(state, { type: "SELECT_PROTEIN", proteinId: "P1" });
      state = reduceScene(state, { type: "CLOSE_PROTEIN" });
      expect(state.mode).toBe("universe");
      expect(state.territoryId).toBeNull();
      expect(state.selectedProteinId).toBeNull();
      // Unlike RETURN_TO_UNIVERSE (an explicit reset), closing the panel is not a reset —
      // it should not silently discard a query the user is still in the middle of.
      expect(state.query).toBe("kinase");
      expect(state.queryResultIds).toEqual(["P1", "P2"]);
    });

    it("differs from a single RETURN_ONE_LEVEL step in Inspect (which only reaches Glance)", () => {
      let closeState = reduceScene(initialSceneState, { type: "ENTER_TERRITORY", territoryId: "catalysis-metabolism" });
      closeState = reduceScene(closeState, { type: "SELECT_PROTEIN", proteinId: "P69905" });
      closeState = reduceScene(closeState, { type: "INSPECT_STRUCTURE" });
      let backState = closeState;
      closeState = reduceScene(closeState, { type: "CLOSE_PROTEIN" });
      backState = reduceScene(backState, { type: "RETURN_ONE_LEVEL" });
      expect(closeState.mode).toBe("territory");
      expect(backState.mode).toBe("glance");
      expect(backState.selectedProteinId).not.toBeNull();
    });
  });
});
