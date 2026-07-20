import type { CameraContext } from "./atlas-data";

export type SceneMode = "landing" | "universe" | "diving" | "structure" | "xray" | "designing" | "designComplete" | "comparison";
export type DesignPlayback = "paused" | "playing";

export type Protein = {
  id: string;
  name: string;
  source: string;
  accession: string;
  family: string;
  length: number;
  confidence: number | null;
  designableSite: { id: string; name: string; residues: string };
  citation: string;
};

export type SceneCommand =
  | { type: "ENTER_ATLAS" }
  | { type: "FLY_TO_PROTEIN"; proteinId: string }
  | { type: "RETURN_TO_UNIVERSE" }
  | { type: "SET_CAMERA_CONTEXT"; context: CameraContext }
  | { type: "QUERY_ATLAS"; query: string; resultIds: string[] }
  | { type: "CLEAR_QUERY" }
  | { type: "FOCUS_REGION"; regionId: string }
  | { type: "COLOR_BY"; scheme: "confidence" | "trusted_core" | "hydrophobicity" }
  | { type: "SET_REPRESENTATION"; representation: "cartoon" | "surface" | "ball-and-stick" }
  | { type: "SET_LIGAND_VISIBILITY"; visible: boolean }
  | { type: "FOCUS_RESIDUES"; start: number; end: number; chain?: string; requestId: number }
  | { type: "RETRY_STRUCTURE" }
  | { type: "START_DESIGN_JOURNEY"; trajectoryId: string; specification: string }
  | { type: "PLAY_DESIGN_TRAJECTORY" }
  | { type: "PAUSE_DESIGN_TRAJECTORY" }
  | { type: "STEP_DESIGN_STAGE"; direction: "forward" | "backward" }
  | { type: "SEEK_DESIGN_STAGE"; stageIndex: number }
  | { type: "RESTART_DESIGN_TRAJECTORY" }
  | { type: "SET_DESIGN_STAGE"; stageIndex: number }
  | { type: "SELECT_DESIGN_CANDIDATE"; candidateId: string }
  | { type: "COMPARE_DESIGN_CANDIDATES"; candidateIds: string[] }
  | { type: "LEAVE_DESIGN_JOURNEY" };

export type SceneState = {
  mode: SceneMode;
  selectedProteinId: string | null;
  query: string;
  queryResultIds: string[];
  focusedRegionId: string | null;
  cameraContext: CameraContext | null;
  designSpecification: string | null;
  designTrajectoryId: string | null;
  designStageIndex: number;
  selectedDesignCandidateId: string | null;
  comparedDesignCandidateIds: string[];
  designPlayback: DesignPlayback;
  structureRepresentation: "cartoon" | "surface" | "ball-and-stick";
  ligandsVisible: boolean;
  residueFocus: { start: number; end: number; chain?: string; requestId: number } | null;
  structureRetry: number;
  lastCommand: SceneCommand["type"] | null;
};

export const initialSceneState: SceneState = {
  mode: "landing",
  selectedProteinId: null,
  query: "",
  queryResultIds: [],
  focusedRegionId: null,
  cameraContext: null,
  designSpecification: null,
  designTrajectoryId: null,
  designStageIndex: 0,
  selectedDesignCandidateId: null,
  comparedDesignCandidateIds: [],
  designPlayback: "paused",
  structureRepresentation: "cartoon",
  ligandsVisible: true,
  residueFocus: null,
  structureRetry: 0,
  lastCommand: null,
};

export function reduceScene(state: SceneState, command: SceneCommand): SceneState {
  switch (command.type) {
    case "ENTER_ATLAS": return { ...state, mode: "universe", lastCommand: command.type };
    case "FLY_TO_PROTEIN": return { ...state, mode: "diving", selectedProteinId: command.proteinId, structureRepresentation: "cartoon", ligandsVisible: true, residueFocus: null, lastCommand: command.type };
    case "RETURN_TO_UNIVERSE": return { ...state, mode: "universe", selectedProteinId: null, lastCommand: command.type };
    case "SET_CAMERA_CONTEXT": return { ...state, cameraContext: command.context, lastCommand: command.type };
    case "QUERY_ATLAS": return { ...state, query: command.query, queryResultIds: command.resultIds, mode: "universe", lastCommand: command.type };
    case "CLEAR_QUERY": return { ...state, query: "", queryResultIds: [], lastCommand: command.type };
    case "FOCUS_REGION": return { ...state, focusedRegionId: command.regionId, mode: "universe", lastCommand: command.type };
    case "COLOR_BY": return { ...state, mode: command.scheme === "trusted_core" ? "xray" : "structure", lastCommand: command.type };
    case "SET_REPRESENTATION": return { ...state, structureRepresentation: command.representation, lastCommand: command.type };
    case "SET_LIGAND_VISIBILITY": return { ...state, ligandsVisible: command.visible, lastCommand: command.type };
    case "FOCUS_RESIDUES": return { ...state, residueFocus: { start: Math.min(command.start, command.end), end: Math.max(command.start, command.end), chain: command.chain, requestId: command.requestId }, lastCommand: command.type };
    case "RETRY_STRUCTURE": return { ...state, structureRetry: state.structureRetry + 1, lastCommand: command.type };
    case "START_DESIGN_JOURNEY": return { ...state, mode: "designing", designTrajectoryId: command.trajectoryId, designSpecification: command.specification, designStageIndex: 0, selectedDesignCandidateId: null, comparedDesignCandidateIds: [], designPlayback: "paused", lastCommand: command.type };
    case "PLAY_DESIGN_TRAJECTORY": return { ...state, mode: "designing", designPlayback: "playing", lastCommand: command.type };
    case "PAUSE_DESIGN_TRAJECTORY": return { ...state, designPlayback: "paused", lastCommand: command.type };
    case "STEP_DESIGN_STAGE": return { ...state, mode: "designing", designPlayback: "paused", designStageIndex: Math.max(0, state.designStageIndex + (command.direction === "forward" ? 1 : -1)), lastCommand: command.type };
    case "SEEK_DESIGN_STAGE": return { ...state, mode: "designing", designPlayback: "paused", designStageIndex: Math.max(0, command.stageIndex), lastCommand: command.type };
    case "RESTART_DESIGN_TRAJECTORY": return { ...state, mode: "designing", designPlayback: "paused", designStageIndex: 0, selectedDesignCandidateId: null, comparedDesignCandidateIds: [], lastCommand: command.type };
    case "SET_DESIGN_STAGE": return { ...state, mode: "designing", designPlayback: "paused", designStageIndex: Math.max(0, command.stageIndex), lastCommand: command.type };
    case "SELECT_DESIGN_CANDIDATE": return { ...state, selectedDesignCandidateId: command.candidateId, lastCommand: command.type };
    case "COMPARE_DESIGN_CANDIDATES": return { ...state, mode: "comparison", comparedDesignCandidateIds: command.candidateIds.slice(0, 2), designPlayback: "paused", lastCommand: command.type };
    case "LEAVE_DESIGN_JOURNEY": return { ...state, mode: "structure", designTrajectoryId: null, designSpecification: null, designStageIndex: 0, selectedDesignCandidateId: null, comparedDesignCandidateIds: [], designPlayback: "paused", lastCommand: command.type };
  }
}
