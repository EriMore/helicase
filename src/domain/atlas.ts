export type SceneMode = "universe" | "territory" | "glance" | "inspect" | "design";
export type StructureRepresentation = "cartoon" | "surface" | "ball-and-stick" | "spacefill";
export type StructureColorMode = "chain" | "domain";
export type IdentityTab = "glance" | "learn";
export type DesignPlayback = "playing" | "paused";

export type ResidueFocus = { start: number; end: number; chain?: string; requestId: number };
export type SequenceSelection = { start: number; end: number };

export type DesignState = {
  trajectoryId: string;
  specification: string;
  playback: DesignPlayback;
  /** Continuous 0..1 position across the full spatial trajectory — never a discrete click-through index. */
  progress: number;
  selectedCandidateId: string | null;
};

export type SceneCommand =
  | { type: "SELECT_PROTEIN"; proteinId: string }
  | { type: "ENTER_TERRITORY"; territoryId: string }
  | { type: "NAV_TO_LEVEL"; level: "universe" | "territory" | "protein" | "structure" }
  | { type: "RETURN_ONE_LEVEL" }
  | { type: "RETURN_TO_UNIVERSE" }
  | { type: "CLOSE_PROTEIN" }
  | { type: "QUERY_ATLAS"; query: string; resultIds: string[] }
  | { type: "CLEAR_QUERY" }
  | { type: "SET_TAB"; tab: IdentityTab }
  | { type: "TOGGLE_THREADS" }
  | { type: "OPEN_SEQUENCE" }
  | { type: "CLOSE_SEQUENCE" }
  | { type: "SET_SEQUENCE_SELECTION"; selection: SequenceSelection | null }
  | { type: "INSPECT_STRUCTURE" }
  | { type: "SET_REPRESENTATION"; representation: StructureRepresentation }
  | { type: "SET_COLOR_MODE"; colorMode: StructureColorMode }
  | { type: "SET_LIGAND_VISIBILITY"; visible: boolean }
  | { type: "SET_CONFIDENCE_XRAY"; visible: boolean }
  | { type: "FOCUS_RESIDUES"; start: number; end: number; chain?: string; requestId: number }
  | { type: "RETRY_STRUCTURE" }
  | { type: "START_DESIGN"; trajectoryId: string; specification: string }
  | { type: "SET_DESIGN_PLAYBACK"; playback: DesignPlayback }
  | { type: "SEEK_DESIGN"; progress: number }
  | { type: "SELECT_DESIGN_CANDIDATE"; candidateId: string }
  | { type: "EXIT_DESIGN" };

export type SceneState = {
  mode: SceneMode;
  selectedProteinId: string | null;
  territoryId: string | null;
  query: string;
  queryResultIds: string[];
  tab: IdentityTab;
  threadsOn: boolean;
  seqOpen: boolean;
  seqSelection: SequenceSelection | null;
  structureRepresentation: StructureRepresentation;
  structureColorMode: StructureColorMode;
  ligandsVisible: boolean;
  confidenceXray: boolean;
  residueFocus: ResidueFocus | null;
  structureRetry: number;
  design: DesignState | null;
  lastCommand: SceneCommand["type"] | null;
};

export const initialSceneState: SceneState = {
  mode: "universe",
  selectedProteinId: null,
  territoryId: null,
  query: "",
  queryResultIds: [],
  tab: "glance",
  threadsOn: false,
  seqOpen: false,
  seqSelection: null,
  structureRepresentation: "cartoon",
  structureColorMode: "chain",
  ligandsVisible: true,
  confidenceXray: false,
  residueFocus: null,
  structureRetry: 0,
  design: null,
  lastCommand: null,
};

const structureDefaults = {
  structureRepresentation: "cartoon" as const,
  structureColorMode: "chain" as const,
  ligandsVisible: true,
  confidenceXray: false,
  residueFocus: null,
};

export function reduceScene(state: SceneState, command: SceneCommand): SceneState {
  switch (command.type) {
    case "SELECT_PROTEIN":
      return {
        ...state, ...structureDefaults,
        mode: "glance", selectedProteinId: command.proteinId, tab: "glance",
        threadsOn: false, seqOpen: false, seqSelection: null, design: null,
        lastCommand: command.type,
      };
    case "ENTER_TERRITORY":
      return {
        ...state, mode: "territory", territoryId: command.territoryId, selectedProteinId: null,
        query: "", queryResultIds: [], design: null, seqOpen: false, threadsOn: false,
        lastCommand: command.type,
      };
    case "NAV_TO_LEVEL": {
      if (command.level === "universe") return reduceScene(state, { type: "RETURN_TO_UNIVERSE" });
      if (command.level === "territory") {
        if (state.territoryId == null || !(state.mode === "glance" || state.mode === "inspect" || state.mode === "design")) return state;
        return { ...state, mode: "territory", selectedProteinId: null, design: null, seqOpen: false, threadsOn: false, lastCommand: command.type };
      }
      if (command.level === "protein") {
        if (state.selectedProteinId == null || !(state.mode === "inspect" || state.mode === "design")) return state;
        return { ...state, mode: "glance", design: null, seqOpen: false, lastCommand: command.type };
      }
      if (command.level === "structure") {
        if (state.selectedProteinId == null || state.mode !== "glance") return state;
        return { ...state, ...structureDefaults, mode: "inspect", lastCommand: command.type };
      }
      return state;
    }
    case "RETURN_ONE_LEVEL": {
      if (state.mode === "design") return reduceScene(state, { type: "EXIT_DESIGN" });
      if (state.mode === "inspect") return { ...state, mode: "glance", seqOpen: false, lastCommand: command.type };
      if (state.mode === "glance") return state.territoryId != null
        ? { ...state, mode: "territory", selectedProteinId: null, threadsOn: false, lastCommand: command.type }
        : reduceScene(state, { type: "RETURN_TO_UNIVERSE" });
      if (state.mode === "territory") return reduceScene(state, { type: "RETURN_TO_UNIVERSE" });
      return state;
    }
    case "RETURN_TO_UNIVERSE":
      return {
        ...state, mode: "universe", selectedProteinId: null, territoryId: null,
        query: "", queryResultIds: [], threadsOn: false, seqOpen: false, design: null,
        lastCommand: command.type,
      };
    // The identity panel's close button — and only the close button — fully clears the
    // Protein state in one step, regardless of whether Glance, Inspect, or Design is
    // currently showing, and returns to the cluster or Universe the selection came from.
    // A query the user typed to reach that protein is preserved rather than discarded —
    // unlike the header's explicit "return to Universe" action, this is not a reset.
    // Back/Escape/Depth-Rail perform a one-level return instead; see
    // docs/handoff/DESIGN_DELTA.md.
    case "CLOSE_PROTEIN":
      return state.territoryId != null
        ? {
            ...state, ...structureDefaults, mode: "territory", selectedProteinId: null,
            threadsOn: false, seqOpen: false, seqSelection: null, design: null,
            lastCommand: command.type,
          }
        : {
            ...state, ...structureDefaults, mode: "universe", selectedProteinId: null,
            threadsOn: false, seqOpen: false, seqSelection: null, design: null,
            lastCommand: command.type,
          };
    case "QUERY_ATLAS":
      return {
        ...state, mode: "universe", selectedProteinId: null, territoryId: null,
        query: command.query, queryResultIds: command.resultIds, design: null,
        lastCommand: command.type,
      };
    case "CLEAR_QUERY":
      return { ...state, query: "", queryResultIds: [], lastCommand: command.type };
    case "SET_TAB":
      return { ...state, tab: command.tab, lastCommand: command.type };
    case "TOGGLE_THREADS":
      return { ...state, threadsOn: !state.threadsOn, lastCommand: command.type };
    case "OPEN_SEQUENCE":
      return { ...state, seqOpen: true, lastCommand: command.type };
    case "CLOSE_SEQUENCE":
      return { ...state, seqOpen: false, lastCommand: command.type };
    case "SET_SEQUENCE_SELECTION":
      return { ...state, seqSelection: command.selection, lastCommand: command.type };
    case "INSPECT_STRUCTURE":
      return { ...state, ...structureDefaults, mode: "inspect", lastCommand: command.type };
    case "SET_REPRESENTATION":
      return { ...state, structureRepresentation: command.representation, lastCommand: command.type };
    case "SET_COLOR_MODE":
      return { ...state, structureColorMode: command.colorMode, lastCommand: command.type };
    case "SET_LIGAND_VISIBILITY":
      return { ...state, ligandsVisible: command.visible, lastCommand: command.type };
    case "SET_CONFIDENCE_XRAY":
      return { ...state, confidenceXray: command.visible, lastCommand: command.type };
    case "FOCUS_RESIDUES":
      return { ...state, residueFocus: { start: Math.min(command.start, command.end), end: Math.max(command.start, command.end), chain: command.chain, requestId: command.requestId }, lastCommand: command.type };
    case "RETRY_STRUCTURE":
      return { ...state, structureRetry: state.structureRetry + 1, lastCommand: command.type };
    case "START_DESIGN":
      return {
        ...state, mode: "design",
        design: { trajectoryId: command.trajectoryId, specification: command.specification, playback: "playing", progress: 0, selectedCandidateId: null },
        seqOpen: false, lastCommand: command.type,
      };
    case "SET_DESIGN_PLAYBACK":
      return state.design ? { ...state, design: { ...state.design, playback: command.playback }, lastCommand: command.type } : state;
    case "SEEK_DESIGN":
      return state.design ? { ...state, design: { ...state.design, progress: Math.max(0, Math.min(1, command.progress)) }, lastCommand: command.type } : state;
    case "SELECT_DESIGN_CANDIDATE":
      return state.design ? { ...state, design: { ...state.design, selectedCandidateId: command.candidateId }, lastCommand: command.type } : state;
    case "EXIT_DESIGN":
      return { ...state, mode: "inspect", design: null, lastCommand: command.type };
  }
}
