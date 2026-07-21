# Implementation Gap Matrix

Row-for-row against every named state in `docs/design/final/SCREEN_STATE_MATRIX.md`. `Gap` is sized as: **None** (matches), **Restyle** (engine/data correct, presentation must change), **Extend** (engine partially exists, needs new capability), **Build** (does not exist), **Reconcile** (both exist but disagree and must be merged deliberately).

## 1 · Loading & Arrival

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Static-logo loading | Static logo, no spin, thin `hx-scan` sweep only, "Resolved N of 575,503" | `.loader` in `globals.css` + `AtlasExperience.tsx:318-324`: animated orbiting dual-ring + 3 pulsing dots (`loader-orbit`), moving gradient bar. Logo (`icon_white_svg.svg`) itself does not spin — good — but surrounding chrome reads as progress sparkle | **Restyle** | Real progress data (`atlas.progress`, `atlas.status`) already flows correctly; only the visual treatment must change |
| Universe arrival | Instant reveal once `phase==='ready'`, chrome gated on phase | `loaderVisible = !minimumLoadComplete \|\| !atlas.manifest` gates the loader overlay; underlying canvas is already mounted and animating beneath it | **Restyle** | Logic is compatible; verify no chrome flashes in before intended gate when restyled |
| Light ambient orbit | Only in Universe/Territory, 3500ms idle resume, theta+=0.00022 rad/frame | `clusters.rotation.y = Math.sin(elapsed*0.025)*0.006` runs unconditionally in the render loop (not idle-gated, not mode-gated, different formula/magnitude entirely) | **Build** | Current effect is a decorative sway, not the design's idle-triggered drift with resume timer |
| Universe navigation (manual) | Orbit 0.0045 rad/px, pan scale-aware, zoom-to-pointer, double-click focus `r→max(160,r×0.6)` | `CameraNavigation.orbit/truck/dolly` present; orbit and truck constants differ (see `CLAUDE_TAKEOVER_AUDIT.md` §1.3); **no double-click focus handler exists** in `WorldCanvas.tsx` (only single-click select/focus) | **Extend** | Add double-click listener; reconcile numeric constants |

## 2 · Query & Ask Atlas

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Query input | Suggestion chips hide on typing | `atlas-query` form exists, no suggestion chips at all | **Build** | |
| Query-driven reorganization | 1500ms camera + 1500ms reflow, `dimNon`, family pulls forward | `runQuery` → `QUERY_ATLAS` → `WorldCanvas` highlights via `highlightedIds` set, framing via `navigation.current.focus(centre, framingDistance, "query-results")`; no `dimNon` factor applied to non-matches (matches shrink to `0.003` opacity multiplier on the *cluster* layer only, see `WorldCanvas.tsx:354` `queryClusterFactor`) — functionally close but not the specified dim treatment | **Restyle** | Reflow mechanism differs (opacity swap, not `dimNon`-style graded dim); timing not on the specified duration table |
| Ask Atlas | ⌘K summon, top-centered panel, visible action trace, ~9s auto-dismiss | Permanent bottom-right panel, no ⌘K, no auto-dismiss, no visible trace | **Build** | Keep `/api/copilot` streaming engine unchanged |

## 3 · Territory & Neighbourhood

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Territory selection (hover) | Cursor/label affordance, no state change | `onPointerMove` sets cursor to `crosshair` on protein/cluster hover — partial equivalent, no label affordance | **Extend** | |
| Territory entry | Family ×1.7 expand, others dim, `territory` view, camera `r→260` | `focusCluster()` calls `FOCUS_REGION` + `navigator.focus(center, 108, ...)` — no ×1.7 expansion of point sizes, no distinct `territory` mode (stays in `universe`) | **Build** | Requires the `SceneMode` extension in the roadmap |
| Neighbourhood exploration | Free movement within territory, labels resolve | No neighbourhood concept exists; production only has region/cluster/protein granularity | **Build** | |

## 4 · Protein & Identity

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Protein selection | Bracket marker, family lit/rest dim 0.6, `r→150`, 1600ms | `selectProtein()` → `FLY_TO_PROTEIN` → camera focus `r=18` (not 150), no bracket marker, no dim-to-0.6 (structure mode instead drops opacity to 0.025/0.035 — a much harder cut, not a graded dim) | **Build** | Current behavior dives almost straight to structure distance, skipping a Glance framing distance |
| Glance (tab) | Default tab: short rows, one sourced fact, citation | `specimen-card`: 4 `<dl>` rows (organism/family/residues/evidence) + citation line — a real subset of Glance content, no "sourced fact" teal-rule treatment | **Restyle + Extend** | Data model (`AtlasProtein`) lacks a `sourcedFact`/function-summary field — needs schema extension sourced from UniProt, not invented |
| Learn (tab) | Pathway/location/disease/homologues, Domains, References | Absent — no tab switcher exists at all, no underlying data fields | **Build** | Needs real UniProt feature/domain/disease annotation fetch |
| Relationship threads | ≤3 threads, off by default, typed/sourced | No UI. `explainProximity()` (`spatialization.ts:57`) computes region/family/organism-match signals with an honest caveat but is never imported/called anywhere | **Build** | Wire the existing function first; it is a reasonable v1 basis but should be extended with real UniProt cross-references before calling matches "relationships" rather than "shared classification" |
| Sequence expansion | Full-width bidirectional panel | No component, no hook, `AtlasProtein` has no `sequence` field, no route fetches sequence | **Build** | Full net-new subsystem |

## 5 · Structure Inspection

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Structure inspection entry | `r→90`, fade+build, universe dims to 0.24 | `StructureView` mounts on `structureMode`; `WorldCanvas` opacity drops to 0.025–0.035 (harder than 0.24) via `mode-structure .world-canvas{opacity:.2}` CSS class — reasonably close numerically (0.2 vs 0.24) | **Restyle** | Close enough to be a token tweak, not a rebuild |
| Cartoon / Surface / Ball-and-stick | 3 of 4 representations | Implemented via real Mol* `representation.addRepresentation` calls (`StructureView.tsx:123-127`) | **None** (for these 3) | |
| Spacefill | 4th representation | Not implemented — `StructureRepresentation` type only has 3 members | **Extend** | Mol* supports `spacefill` representation type natively; small addition |
| Ligand visibility | Toggle | Implemented (`SET_LIGAND_VISIBILITY`, real Mol* ligand component) | **None** | |
| Chain colouring (chain vs domain) | Toggle | Not implemented — representations always use a fixed uniform color or `element-symbol`, no chain/domain color mode | **Build** | Row 35 of `PRODUCT_COMPLETION_AUDIT.md` explicitly defers this pending verified auth/label asym-ID work — respect that blocker, do not rush chain color in |
| Experimental / Predicted gating | No confidence UI on experimental | Correctly implemented — `confidence.status` only resolves for `reference?.kind === "predicted"` (`useStructureConfidence.ts:14`) | **None** | Real, verified, keep exactly |
| Confidence X-Ray | 4-stop gradient + legend, gated | Real verified pLDDT via `MAQualityAssessment`; UI shows mean/ranges/limitations in prose (`xray-note`) but no visual gradient-swatch legend | **Restyle** | Engine correct; add the legend chrome |

## 6 · Protein Design Journey

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Initiation | `r→100`, 1400ms, panel opens | `launchDesign()` → `START_DESIGN_JOURNEY`; no dedicated camera tween for this transition (reuses ambient structure framing) | **Extend** | |
| Stage 1 Target / 2 Objective / 3 Binding Site | Prose stages | Real stage 1 exists (`source-complex`) with real prose; no explicit "Objective" or "Binding Site" stages — objective text exists at the trajectory level (`objective` field) but is not surfaced as its own stage | **Reconcile** | Present the real `objective`/`targetSite` fields as stages 2–3 rather than fabricating new content |
| Stage 4 Backbone / 5 Sequence Design | RFdiffusion-class / ProteinMPNN-class stages | Real ProteinMPNN stage exists (`sequence-generation`) — maps to design stage 5, not 4; **no backbone/RFdiffusion stage exists or should be invented** — no such artifact is available | **Reconcile** | Stage 4 must render as an explicit "unavailable" evidence-gate state, matching the real `validation-boundary` stage's own limitations language — never fabricate backbone frames |
| Stage 6 Predicted Fold / 7 Metrics | Predicted structure + metrics table | Not available — no predicted-fold artifact exists for this journey | **None available — must render as evidence gate, not build fake data** | Matches the existing `validation-boundary` stage's honest stance |
| Stage 8 Compare | Two-candidate comparison | Real — both `6ehb-sample-1`/`6ehb-sample-2` candidates exist with real scores; PR #7's unmerged `COMPARE_DESIGN_CANDIDATES` command is the right mechanism (cherry-pick per `LATEST_PR_INTEGRATION_PLAN.md`) | **Extend (mechanism exists in PR #7, not yet merged)** | |
| Stage 9 Candidate (final) | Selected candidate as output | `SELECT_DESIGN_CANDIDATE` exists and works today | **Restyle** | |
| Design exit | Return to `inspect`, no forced re-tween | `LEAVE_DESIGN_JOURNEY` → `mode:"structure"`, matches | **None** | |

## 7 · Return & Spatial Restoration

| State | Design contract | Current implementation | Gap | Note |
|---|---|---|---|---|
| Return to Protein / Territory / Universe (exact restore) | `levelCam.<level>` stack, verbatim restore per level | Single `state.cameraContext` slot + `CameraNavigation.history` (32-entry stack) exist as primitives, but nothing surfaces a per-depth-level `levelCam` map; only the pre-query context is currently round-tripped (`queryReturnContext` in `WorldCanvas.tsx`) | **Extend** | The stack primitive (`history`) already exists — this is a matter of keying/surfacing it per level, not building a new data structure |
| `onHome()` full clear | Clears `levelCam` stack + query | `navigator.home()` exists (`camera-navigation.ts:44`) and resets camera; does not explicitly clear an active query in the same action today (query and camera are decoupled state) | **Extend** | |

## 8 · Theme & Motion

| State | Design contract | Current implementation | Gap |
|---|---|---|---|
| Light mode (flagship) | Full authored token set | Does not exist | **Build** |
| Dark mode | Authored "Specimen Chamber," additive point blending | Exists but is the pre-Claude-Design dark palette, not `DESIGN_TOKENS.md` values | **Build** (replace) |
| Reduced-motion | Global disable of drift + instant tweens | `prefers-reduced-motion` correctly read once (`WorldCanvas.tsx:191`) and wired to `CameraNavigation.reducedMotion`; CSS-level `@media (prefers-reduced-motion:reduce)` block also present in `globals.css:33,78` | **Restyle only — mechanism is correct** | Extend the same flag through new panels as they're built |

## 9 · Error States

| State | Design contract | Current implementation | Gap |
|---|---|---|---|
| Selection data miss | Stay put, `deny` cue | No sound system exists so no `deny` cue is possible yet; "stay put" behavior (no navigation on a miss) is implicitly correct since nothing dispatches on a failed raycast | **Extend (needs sound system)** |
| Structure fetch failure | Loading→retry affordance, universe stays interactive | Real: `structureStatus === "unavailable"` renders a "Retry structure" button dispatching `RETRY_STRUCTURE`; universe remains mounted underneath (opacity-reduced, not removed) | **Restyle** | Engine-correct |
| Empty/no-match query | Explicit zero-result message, `deny` cue | `"No indexed signals yet"` message renders — real zero-state messaging exists; no `deny` sound (no sound system) | **Extend (needs sound system)** |
| Invalid Ask Atlas action | Legible trace even for no-op | No visible trace UI exists at all yet (§ Ask Atlas above) | **Build** |
