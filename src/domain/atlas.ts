export type SceneMode = "map" | "diving" | "structure" | "xray" | "designing" | "designComplete";

export type Protein = {
  id: string;
  name: string;
  source: string;
  accession: string;
  family: string;
  length: number;
  confidence: number;
  designableSite: { id: string; name: string; residues: string };
  citation: string;
};

export type SceneCommand =
  | { type: "FLY_TO_PROTEIN"; proteinId: string }
  | { type: "RETURN_TO_MAP" }
  | { type: "COLOR_BY"; scheme: "confidence" | "trusted_core" | "hydrophobicity" }
  | { type: "DESIGN_BINDER"; targetSite: string; specification: string }
  | { type: "DESIGN_COMPLETE" };

export type SceneState = {
  mode: SceneMode;
  selectedProteinId: string | null;
  designSpecification: string | null;
  lastCommand: SceneCommand["type"] | null;
};

export const initialSceneState: SceneState = { mode: "map", selectedProteinId: null, designSpecification: null, lastCommand: null };

export function reduceScene(state: SceneState, command: SceneCommand): SceneState {
  switch (command.type) {
    case "FLY_TO_PROTEIN": return { ...state, mode: "diving", selectedProteinId: command.proteinId, lastCommand: command.type };
    case "RETURN_TO_MAP": return { ...initialSceneState, lastCommand: command.type };
    case "COLOR_BY": return { ...state, mode: command.scheme === "trusted_core" ? "xray" : "structure", lastCommand: command.type };
    case "DESIGN_BINDER": return { ...state, mode: "designing", designSpecification: command.specification, lastCommand: command.type };
    case "DESIGN_COMPLETE": return { ...state, mode: "designComplete", lastCommand: command.type };
  }
}
