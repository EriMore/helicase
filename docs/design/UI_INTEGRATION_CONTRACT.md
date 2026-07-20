# UI Integration Contract

Status: canonical v1 boundary for the completed functional engine
Audience: product-engine, renderer, GPT, and future Claude design implementers

## Purpose

The visual shell is replaceable. The Atlas engine, scientific adapters, camera behavior, query semantics, provenance, and tool validation are not presentation concerns. A new interface consumes a serializable scene snapshot, issues typed actions, subscribes to typed events, and mounts isolated renderers. It must not reach into Three.js, Mol*, workers, API routes, or mutable refs.

## Boundary

```text
Presentation adapters
  -> user actions
SceneController
  -> validated commands -> deterministic reducer
  -> asynchronous effects -> scientific/data/GPT adapters
  -> engine events + immutable scene snapshot
Presentation adapters

Scientific renderers
  WorldRendererAdapter (Three.js)
  StructureRendererAdapter (Mol*)
```

All direct manipulation, UI controls, guided sequences, design playback, and GPT tools use the same command path. Prose never mutates the scene.

## Complete scene snapshot

The public engine snapshot is immutable and serializable.

```ts
type AtlasSceneSnapshot = {
  revision: number;
  mode: SceneMode;
  camera: CameraState;
  selection: SelectionState;
  query: QueryState;
  loading: LoadingState;
  structure: StructureState;
  confidence: ConfidenceState;
  design: DesignTrajectoryState;
  copilot: CopilotState;
  history: NavigationHistoryState;
  environment: EnvironmentState;
  errors: RecoveryState[];
};
```

No property contains a DOM node, Three.js class, Mol* object, `AbortController`, worker, stream reader, or callback.

## Scene modes

`loading | landing | universe | transitioning-to-structure | structure | confidence | design | comparison | recovering`

Modes describe experience state, not components. Overlays such as query results or copilot output remain orthogonal substates. A mode transition is legal only through a command accepted by the current state.

## Camera state

```ts
type CameraState = {
  pose: CameraPose;
  target: Vec3;
  scale: "universe" | "region" | "cluster" | "protein" | "structure";
  transition: null | CameraTransition;
  constraints: CameraConstraints;
  interaction: "idle" | "orbit" | "truck" | "dolly" | "scripted";
  reducedMotion: boolean;
};
```

Camera snapshots are stable value objects. Direct input issues navigation actions; the camera engine resolves them. Renderers receive poses but do not own navigation policy. Automated movement is cancellable by direct input and reports cancellation without corrupting history.

## Selection state

Selection records protein accession, source record, active cluster/region, hover/focus distinction, optional structure/chain/residue selections, and evidence. Hover is ephemeral and never substitutes for committed selection.

## Query state

Query state contains raw and normalized query, lifecycle, local/remote scope, cursor, result IDs, evidence/matched fields, spatial response strategy, request ID, and partial/complete coverage. Results are scientific data objects; list cards and scene highlights are separate views over them.

## Loading state

Each subsystem reports independently:

`idle | queued | loading | streaming | ready | degraded | failed | cancelled`

Atlas manifest, browser shards, remote corpus, structure, confidence, design artifacts and copilot each expose honest progress where measurable, attempt count, timestamp, and recovery action. The UI may compose these states but must not invent progress.

## Structure state

Structure state includes requested and resolved references, evidence kind, accession/model version, source URLs, chain and residue mapping, representation, visible chains/ligands, loading lifecycle, renderer readiness, provenance, and coverage caveats. It contains no Mol* state objects.

## Confidence state

Confidence state is `unavailable | loading | available | mismatch | failed`. Available confidence includes metric (`pLDDT`), model/source version, residue-keyed values, summary/ranges, indexing scheme, optional PAE reference, provenance, and limitations. Experimental structures resolve to `unavailable` unless a distinct, scientifically valid uncertainty metric is explicitly introduced.

## Design-trajectory state

Design state contains eligibility, objective, target identity/site, trajectory identity/version, stages, current stage, candidates, selected/comparison candidates, metrics, playback state, provenance and limitations. Precomputed stages are labelled precomputed. Stage time is evidence metadata, never a simulated live-compute claim.

## Copilot state

Copilot state contains credential mode (`credentialed | local-explicit | unavailable`), request lifecycle, request ID, streamed text, pending/accepted/rejected tool calls, citations/provenance references, recoverable errors and cancellation. The UI renders it; only the tool executor can issue scene commands.

## Error and recovery states

Errors use stable subsystem/code pairs, a safe public message, retryability, recovery action, attempt count, and optional diagnostic detail excluded from user-facing output. One subsystem failing must not collapse unrelated navigation. Fatal startup failure is the only global error.

## User actions

- Enter Atlas; cancel or skip nonessential introduction.
- Orbit, truck/pan, dolly-to-pointer, keyboard-navigate, reset orientation, go home, go back.
- Hover, focus or select a region, cluster, protein, structure element, chain, ligand or residue range.
- Submit/cancel/clear/page a query; activate a query result or neighbourhood.
- Enter/leave structure; retry structure; change representation; show/hide chain/ligand.
- Activate/deactivate confidence; focus low/high-confidence ranges; inspect provenance.
- Start/leave a design journey; move stage; select/compare candidate; inspect source/metrics.
- Submit/cancel/retry a copilot turn; approve only tool calls that are already bounded by product policy.
- Dismiss/retry a recoverable error.

Presentation components convert gestures into these actions. They do not mutate scene state themselves.

## SceneController command surface

Commands are discriminated, runtime-validated, versioned objects. The complete product command families are:

- Lifecycle: `ENTER_ATLAS`, `RESTORE_SESSION`, `REPORT_ENVIRONMENT`.
- Navigation: `NAVIGATE_ORBIT`, `NAVIGATE_TRUCK`, `NAVIGATE_DOLLY`, `FOCUS_TARGET`, `GO_HOME`, `GO_BACK`, `RESET_ORIENTATION`, `CANCEL_CAMERA_TRANSITION`, `CAPTURE_CAMERA_SNAPSHOT`.
- Atlas/query: `QUERY_ATLAS`, `PAGE_QUERY`, `CANCEL_QUERY`, `CLEAR_QUERY`, `MATERIALIZE_PROTEINS`, `FOCUS_REGION`, `FOCUS_CLUSTER`, `COMPARE_NEIGHBOURHOODS`.
- Selection: `HOVER_PROTEIN`, `SELECT_PROTEIN`, `CLEAR_SELECTION`.
- Structure: `ENTER_STRUCTURE`, `LEAVE_STRUCTURE`, `RETRY_STRUCTURE`, `SET_REPRESENTATION`, `SET_CHAIN_VISIBILITY`, `SET_LIGAND_VISIBILITY`, `FOCUS_RESIDUES`, `SELECT_RESIDUES`.
- Confidence: `LOAD_CONFIDENCE`, `ACTIVATE_CONFIDENCE`, `DEACTIVATE_CONFIDENCE`, `FOCUS_CONFIDENCE_RANGE`.
- Design: `START_DESIGN_JOURNEY`, `SET_DESIGN_STAGE`, `STEP_DESIGN_STAGE`, `SELECT_DESIGN_CANDIDATE`, `COMPARE_DESIGN_CANDIDATES`, `LEAVE_DESIGN_JOURNEY`.
- Copilot: `ASK_COPILOT`, `CANCEL_COPILOT`, `RETRY_COPILOT`, `EXECUTE_TOOL_CALL`.
- Recovery: `RETRY_EFFECT`, `DISMISS_ERROR`.

GPT receives only a bounded subset represented by strict tool schemas. Internal commands are never exposed merely because they exist.

## Engine events

Events are immutable facts, not instructions:

- `SCENE_CHANGED`, `MODE_CHANGED`, `CAMERA_CHANGED`, `CAMERA_TRANSITION_STARTED|COMPLETED|CANCELLED`.
- `QUERY_STARTED|PARTIAL|COMPLETED|FAILED|CANCELLED`, `PROTEINS_MATERIALIZED`.
- `SELECTION_CHANGED`, `STRUCTURE_STARTED|READY|FAILED|DISPOSED`.
- `CONFIDENCE_READY|UNAVAILABLE|MISMATCH|FAILED`.
- `DESIGN_READY|STAGE_CHANGED|CANDIDATE_CHANGED|FAILED`.
- `COPILOT_STARTED|DELTA|TOOL_PROPOSED|TOOL_ACCEPTED|TOOL_REJECTED|COMPLETED|FAILED|CANCELLED`.
- `RECOVERY_AVAILABLE`, `ENGINE_DEGRADED`.

Every event carries an event ID, scene revision, timestamp and correlation/request ID when asynchronous.

## UI-consumed data contracts

The UI consumes normalized, runtime-validated contracts for manifest, region, cluster, protein, query result, proximity evidence, structure reference, residue mapping, confidence dataset, design trajectory, copilot turn, provenance and recovery state. IDs are stable. Display labels are data, not identity. Every computed relation names its method and version.

## Deterministic transitions

- Reducer transitions and command legality.
- Stable spatial reconstruction for a protein under a named projection version.
- Camera endpoints, history, home/reset and reduced-motion behavior.
- Query-result highlighting from a fixed result set.
- Structure/design/confidence mode entry after artifacts are ready.
- Design stage navigation over an imported trajectory.

Animation duration may vary by reduced-motion policy, but endpoints and emitted completion/cancellation events do not.

## Asynchronous behavior

- Manifest/shard/corpus retrieval and cache hydration.
- Worker indexing and query execution.
- Remote similarity, structure, confidence and design artifact retrieval.
- Mol* loading/readiness.
- GPT streaming and tool-call arrival.

Each effect accepts cancellation, carries a request ID, ignores stale completion, validates input/output, and reports lifecycle events.

## Replaceable presentation layers

All HTML/CSS composition, typography, panels, labels, list/card views, loading choreography, current HUDs, iconography, sound presentation and Three.js visual style are replaceable. `AtlasExperience` must become a presenter over the engine rather than the owner of product state.

## Isolated scientific renderers

`WorldRendererAdapter` owns GPU resources, picking and draw-time LOD only. `StructureRendererAdapter` owns Mol* lifecycle and translates normalized structure commands into Mol* operations. Neither owns scientific truth, query logic, tool schemas, navigation policy, React state or visual-shell DOM.

## Compatibility and versioning

Public snapshots, commands and scientific payloads carry schema versions. Additive fields are preferred. Breaking changes require a decision record and coordinated adapter bump. Fixtures must pass the same schemas as production data.

## Acceptance criteria

- Replacing every current React presentation component leaves engine, queries, camera, GPT and scientific adapters unchanged.
- Direct input and GPT produce indistinguishable validated command/event paths.
- The engine can be unit-tested without WebGL, Mol*, network or DOM.
- Renderers can be tested with contract fakes.
- No scientific claim exists only as display text; it originates in provenance-carrying state.

## Implemented v1 integration surface

The current React shell consumes the following stable engine and adapter contracts. A replacement shell may change layout and styling without changing these contracts.

| Contract | Owner | Presentation input/output |
| --- | --- | --- |
| `SceneState`, `SceneCommand`, `sceneCommandSchema`, `reduceScene` | SceneController domain | Immutable serializable state; runtime-validated commands |
| `CameraNavigation`, `CameraContext` | Navigation engine | Camera snapshots, focus/home/back/reset/cancel, direct-input deltas |
| `AtlasManifest`, `AtlasProtein`, `AtlasSearchResult` | Atlas data adapter | Validated records, provenance, stable IDs and deterministic positions |
| `useProteinAtlas` | Query/delivery adapter | Progressive load state, complete-corpus search, cancellation, materialization and recovery message |
| `StructureView` | Mol* renderer adapter | Structure reference, representation, ligand visibility, residue focus, retry generation and lifecycle status |
| `useStructureMetadata` | RCSB/SIFTS adapter | Chain identities, UniProt mapping, aligned ranges, coverage and limitations |
| `useStructureConfidence` | AlphaFold adapter | Verified residue-keyed pLDDT, ranges, PAE reference and unavailable/failed states |
| `useDesignTrajectory` | Design evidence adapter | Runtime-validated precomputed stages, candidates, metrics, provenance and evidence boundary |
| `/api/copilot`, `CopilotToolCall` | GPT adapter | NDJSON lifecycle/text/tool events; all tool arguments validated before dispatch |

The shell must not import Mol* state objects, Three.js objects, upstream response shapes, secret environment values, or raw OpenAI function-call arguments.

## Command execution result

Every presentation or GPT command is parsed by `sceneCommandSchema` before reducer execution. Rejected commands do not change scene state and surface a recoverable alert. Tool precondition failures—such as requesting Confidence X-Ray for an experimental structure or starting the verified journey without A5F934 selected—produce recoverable copilot text rather than partial mutation.

## Renderer lifecycle

`StructureView` reports `loading | ready | unavailable`, accepts a monotonic retry generation, and disposes Mol* before replacement. Representation, ligand visibility, and residue focus are SceneController state. `WorldCanvas` owns only draw resources and gesture translation; its reusable navigation policy remains in `CameraNavigation`.

## Accessibility contract

- Every control has an accessible name and keyboard focus indication.
- The universe surface is focusable and references concise navigation instructions.
- Keyboard navigation, home, reset, history and interruption remain available independently of pointer input.
- Reduced-motion preference preserves deterministic endpoints while collapsing nonessential transition duration.
- Status and command failures use semantic live/alert text; scientific meaning never depends on colour alone.

## Recovery contract

Queries and copilot streams are cancellable. Structure loads are retryable. Atlas startup failure offers a reload retry without mutating stored scientific artifacts. Route-level failures are isolated by subsystem; the application error boundary is reserved for uncaught shell failures. Offline copilot mode is explicit and uses the same event/tool protocol as credentialed mode.

## Presentation replacement checklist

Before replacing the shell, verify that it:

1. Imports domain types and schemas, never renderer internals.
2. Issues only `SceneCommand` objects and handles rejection.
3. Preserves camera snapshots on structure entry/return.
4. Preserves source, method, version and limitations beside scientific outputs.
5. Treats async lifecycle and recovery as data, not invented animation progress.
6. Re-runs reducer/schema tests and the complete production browser journey.
