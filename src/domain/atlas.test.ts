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

  it("walks the 5-level hierarchy: universe -> cluster -> glance -> inspect -> design", () => {
    let state = initialSceneState;
    state = reduceScene(state, { type: "ENTER_CLUSTER", clusterId: "catalysis-metabolism" });
    expect(state.mode).toBe("cluster");
    state = reduceScene(state, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    expect(state.mode).toBe("glance");
    state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
    expect(state.mode).toBe("inspect");
    state = reduceScene(state, { type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "test" });
    expect(state.mode).toBe("design");
    expect(state.design?.playback).toBe("playing");
  });

  it("returns one level at a time, preferring cluster over universe when one is active", () => {
    let state = reduceScene(initialSceneState, { type: "ENTER_CLUSTER", clusterId: "catalysis-metabolism" });
    state = reduceScene(state, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("glance");
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("cluster");
    expect(state.clusterId).toBe("catalysis-metabolism");
    state = reduceScene(state, { type: "RETURN_ONE_LEVEL" });
    expect(state.mode).toBe("universe");
    expect(state.clusterId).toBeNull();
  });

  it("returns directly to glance from a protein selected without a cluster", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    expect(state.clusterId).toBeNull();
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

  it("a NAV_TO_LEVEL jump to cluster is rejected when no cluster was ever entered", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "P69905" });
    const before = state;
    state = reduceScene(state, { type: "NAV_TO_LEVEL", level: "cluster" });
    expect(state).toBe(before);
  });

  it("a NAV_TO_LEVEL jump to structure works from design as well as glance (Depth Rail's STRUCTURE row is clickable during a design journey)", () => {
    let state = reduceScene(initialSceneState, { type: "SELECT_PROTEIN", proteinId: "A5F934" });
    state = reduceScene(state, { type: "INSPECT_STRUCTURE" });
    state = reduceScene(state, { type: "START_DESIGN", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "test" });
    state = reduceScene(state, { type: "NAV_TO_LEVEL", level: "structure" });
    expect(state.mode).toBe("inspect");
    expect(state.design).toBeNull();
  });
});
