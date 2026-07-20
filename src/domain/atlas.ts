import type { CameraContext } from "./atlas-data";

export type SceneMode = "landing" | "universe" | "diving" | "structure" | "xray" | "designing" | "designComplete";

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
  | { type: "START_DESIGN_JOURNEY"; trajectoryId: string; specification: string }
  | { type: "SET_DESIGN_STAGE"; stageIndex: number }
  | { type: "SELECT_DESIGN_CANDIDATE"; candidateId: string }
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
  lastCommand: null,
};

export function reduceScene(state: SceneState, command: SceneCommand): SceneState {
  switch (command.type) {
    case "ENTER_ATLAS": return { ...state, mode: "universe", lastCommand: command.type };
    case "FLY_TO_PROTEIN": return { ...state, mode: "diving", selectedProteinId: command.proteinId, lastCommand: command.type };
    case "RETURN_TO_UNIVERSE": return { ...state, mode: "universe", selectedProteinId: null, lastCommand: command.type };
    case "SET_CAMERA_CONTEXT": return { ...state, cameraContext: command.context, lastCommand: command.type };
    case "QUERY_ATLAS": return { ...state, query: command.query, queryResultIds: command.resultIds, mode: "universe", lastCommand: command.type };
    case "CLEAR_QUERY": return { ...state, query: "", queryResultIds: [], lastCommand: command.type };
    case "FOCUS_REGION": return { ...state, focusedRegionId: command.regionId, mode: "universe", lastCommand: command.type };
    case "COLOR_BY": return { ...state, mode: command.scheme === "trusted_core" ? "xray" : "structure", lastCommand: command.type };
    case "START_DESIGN_JOURNEY": return { ...state, mode: "designing", designTrajectoryId: command.trajectoryId, designSpecification: command.specification, designStageIndex: 0, selectedDesignCandidateId: null, lastCommand: command.type };
    case "SET_DESIGN_STAGE": return { ...state, mode: "designing", designStageIndex: Math.max(0, command.stageIndex), lastCommand: command.type };
    case "SELECT_DESIGN_CANDIDATE": return { ...state, selectedDesignCandidateId: command.candidateId, lastCommand: command.type };
    case "LEAVE_DESIGN_JOURNEY": return { ...state, mode: "structure", designTrajectoryId: null, designSpecification: null, designStageIndex: 0, selectedDesignCandidateId: null, lastCommand: command.type };
  }
}
