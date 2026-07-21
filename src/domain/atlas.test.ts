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
    const selected = reduceScene(customized, { type: "FLY_TO_PROTEIN", proteinId: "P69905" });
    expect(selected).toMatchObject({ mode: "diving", selectedProteinId: "P69905", structureRepresentation: "cartoon", ligandsVisible: true, residueFocus: null });
  });

  it("preserves the universe camera snapshot across inspection return", () => {
    const context = { position: [1, 2, 3] as [number, number, number], target: [4, 5, 6] as [number, number, number], scale: "cluster" as const };
    const captured = reduceScene(initialSceneState, { type: "SET_CAMERA_CONTEXT", context });
    const returned = reduceScene(reduceScene(captured, { type: "FLY_TO_PROTEIN", proteinId: "A5F934" }), { type: "RETURN_TO_UNIVERSE" });
    expect(returned.cameraContext).toEqual(context);
    expect(returned.mode).toBe("universe");
  });

  it("supports deterministic interruptible design playback", () => {
    let state = reduceScene(initialSceneState, { type: "START_DESIGN_JOURNEY", trajectoryId: "proteinmpnn-6ehb-example-6", specification: "inspect" });
    state = reduceScene(state, { type: "PLAY_DESIGN_TRAJECTORY" });
    expect(state.designPlayback).toBe("playing");
    state = reduceScene(state, { type: "STEP_DESIGN_STAGE", direction: "forward" });
    expect(state.designPlayback).toBe("paused");
    expect(state.designStageIndex).toBe(1);
    state = reduceScene(state, { type: "COMPARE_DESIGN_CANDIDATES", candidateIds: ["6ehb-sample-1", "6ehb-sample-2"] });
    expect(state.mode).toBe("comparison");
  });
});
