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
  | { type: "DESIGN_BINDER"; targetSite: string; specification: string }
  | { type: "DESIGN_COMPLETE" };

export type SceneState = {
  mode: SceneMode;
  selectedProteinId: string | null;
  query: string;
  queryResultIds: string[];
  focusedRegionId: string | null;
  cameraContext: CameraContext | null;
  designSpecification: string | null;
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
    case "DESIGN_BINDER": return { ...state, mode: "designing", designSpecification: command.specification, lastCommand: command.type };
    case "DESIGN_COMPLETE": return { ...state, mode: "designComplete", lastCommand: command.type };
  }
}
