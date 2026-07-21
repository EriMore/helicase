# Final Acceptance Matrix

Every checklist item in `docs/design/final/VISUAL_ACCEPTANCE_CRITERIA.md`, mapped to implementation location, data source, test, visual evidence, and current completion status. Status legend: **Pass** (verifiable now), **Partial** (real substance, incomplete presentation), **Fail** (not implemented), **N/A-yet** (blocked on a not-yet-built prerequisite).

Updated 2026-07-21 against `claude/final-implementation` (commit `4ea6ff6` and later). Superseded rows from the pre-realization audit are replaced in place; see `docs/handoff/CLAUDE_TAKEOVER_AUDIT.md` for that snapshot's history and `docs/handoff/DESIGN_DELTA.md` for every deliberate deviation.

## Brand & logo

| Criterion | Implementation location | Data source | Test | Visual evidence | Status |
|---|---|---|---|---|---|
| Logo renders exactly once per screen context | `Header.tsx` (masthead lockup), `LoadingScreen.tsx` (icon mark) | `public/brand/logo/*.svg` | Playwright smoke pass | Screenshotted at 1440×900, light+dark | **Pass** |
| Correct canonical asset per theme, no CSS-filter recoloring | `Header.tsx`/`LoadingScreen.tsx` select `*_black_svg.svg`/`*_white_svg.svg` by `theme`; both variants now present under `public/brand/logo/` | `public/brand/logo/` (copied from canonical `logo/`) | None automated | Verified visually in both themes | **Pass** — see `DESIGN_DELTA.md` §2 for the one accepted deviation (combined lockup, not separate icon+wordmark, since no wordmark-only canonical asset exists) |
| Logo never rotates/spins/pulses | `.hx-loading-mark` has no animation; only `.hx-loading-scan` (a decorative sweep, not the logo itself) animates | — | None | Verified by code reading | **Pass** |

## Color discipline

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Light mode is flagship/primary | `app/globals.css` `:root` (undecorated) holds the light token set; `[data-theme="dark"]` overrides | `DESIGN_TOKENS.md` | None automated | Verified visually — light is the default on first load | **Pass** |
| Teal appears only as a rare signal | `--teal` token used only for selection/active-state/depth-rail/design-trajectory accents across all new components; no component uses it as a fill | `app/globals.css` | None automated | Verified by code reading + screenshots | **Pass** |
| Territory palette + evidence/confidence/thread colors match `DESIGN_TOKENS.md` exactly | `--fam-0..5`, `--conf-0..3`, `--thread-*`, `--evidence-predicted` all copied verbatim from the token doc; `src/domain/territories.ts` maps the real 12-region taxonomy onto the 6 hues | `app/globals.css`, `src/domain/territories.ts` | None automated | Verified by code reading | **Pass** |

## Navigation & camera

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Orbit/pan/zoom-to-pointer/double-click-focus match spec constants | `src/engine/camera-navigation.ts`: `orbit` (0.0045 rad/px), `pan`, `dolly` (0.09/0.05 zoom factor, 0.16/-0.10 target lerp), `focusDoubleClick` (r→max(160,r×0.6)) | `MOTION_AND_CAMERA_SPEC.md` | `src/engine/camera-navigation.test.ts` (6 tests: tween settlement, snapshot restore, clamping, tween-blocks-input, home fallback) | Verified by unit test + Playwright orbit drag | **Pass** |
| Ambient orbit only in Universe/Territory, pauses on input, resumes after exact idle window | `CameraEngine.update(dt, ambientEligible)`; `WorldCanvas` passes `ambientEligible = mode==='universe'\|\|mode==='territory'`; 3500ms idle gate in the engine | `src/engine/camera-navigation.ts` | Covered indirectly by camera unit tests (idle timer not unit-tested directly) | Verified by code reading | **Pass** |
| Every Depth Rail level above current is clickable, restores exact prior framing | `DepthRail.tsx` + `CameraEngine.captureLevel/restoreLevel` (exact snapshot, not re-derived) | `src/components/DepthRail.tsx`, `src/engine/camera-navigation.ts` | `camera-navigation.test.ts` snapshot-restore test; Playwright territory-entry test | Verified | **Pass** |
| `Esc` returns one level; home/logo returns to Universe | `AtlasExperience.tsx` global keydown handler dispatches `RETURN_ONE_LEVEL`; header logo click dispatches `RETURN_TO_UNIVERSE` | `src/domain/atlas.ts` `RETURN_ONE_LEVEL` reducer case | `src/domain/atlas.test.ts` (return-one-level walk test); Playwright Escape test | Verified | **Pass** |

## Density & scale honesty

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Universe visibly implies thousands of points/territory, dense-but-breathable | `WorldCanvas.tsx` renders every loaded real protein (up to 75,000) as one instanced field; territory ×1.7 expansion on entry | `public/data/atlas/manifest.json` (75,000 records) | None automated | Screenshotted — dense clusters, 6 distinct territory hues | **Pass**, with a documented label-overlap cosmetic gap (`DESIGN_DELTA.md` §4) |
| UI copy honestly states 75,000 delivery vs 575,503 full corpus, never conflated | `LoadingScreen.tsx` ("Resolved N of 575,503 reviewed"), telemetry bar ("N INDEXED") | `atlas.manifest.coverage.records` + `atlas.addressableCount` | None | Verified by code reading | **Pass** |
| No territory/cluster reads as flat/sparse placeholder | Real per-family hashed placement (`spatializeProtein`); territory centers derived from the same real region layout | `src/domain/spatialization.ts`, `src/domain/territories.ts` | None visual | Screenshotted | **Pass** |

## Identity & disclosure

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Glance/Learn/Inspect three-tier disclosure present, in order | `IdentityPanel.tsx` (Glance default tab, Learn second tab) → `InspectPanel.tsx` (Structure) | `src/components/IdentityPanel.tsx`, `InspectPanel.tsx` | None automated | Verified by code reading | **Pass** |
| Every claim traceable to a citation/source | Glance shows `UniProt {id} · {source} {accession}`; Learn's References list links the real UniProt entry URL; unknown Learn fields show "Not annotated in UniProt" rather than being invented | `app/api/atlas/protein/route.ts`, `useProteinDetail` | None automated | Verified by code reading | **Pass** |
| Unknown fields shown as explicitly unknown, never placeholder-backfilled | `IdentityPanel.tsx` `LearnRow`/`Row` render `"Not annotated in UniProt"`/`unknown` styling rather than omitting or fabricating; no domain/pathway generator exists in production code | `src/components/IdentityPanel.tsx` | None automated | Verified by code reading | **Pass** |

## Sequence

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Real one-letter sequences render at readable scale with working range selection | `SequenceTray.tsx`, real canonical sequence from `useProteinDetail` (any reviewed accession, not just the 3 prototype-hardcoded proteins) | `app/api/atlas/protein/route.ts` (`sequence.value` from UniProt) | None automated | Verified by code reading | **Pass** |
| Residue-range selection bidirectional with 3D | `SequenceTray` drag-select → `SET_SEQUENCE_SELECTION` → `StructureView` `focusRange`; `StructureView`'s new `plugin.behaviors.interaction.click` subscription → `onResiduePick` → `SET_SEQUENCE_SELECTION` closes the loop in both directions | `src/components/StructureView.tsx`, `SequenceTray.tsx` | None automated | Verified by code reading | **Pass** |
| Virtualized/domain-overview presentation for titin-scale proteins | `SequenceTray.tsx` renders a domain track + minimap instead of a single line above 4,000 residues | `src/components/SequenceTray.tsx` (`VIRTUALIZE_THRESHOLD`) | None automated | Verified by code reading | **Pass**; secondary-structure coloring is not yet real (`DESIGN_DELTA.md` §3) |

## Relationship threads

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| ≤3 curated threads, off by default, user-revealed | `IdentityPanel.tsx` + `src/domain/relationships.ts` (`computeRelationshipThreads`, capped at 3, `threadsOn` defaults false) | `src/domain/relationships.ts` | `src/domain/relationships.test.ts` (3 tests) | Verified by unit test | **Pass** |
| Each thread states type/strength/source/basis | Each thread carries `type` ("Shared family"/"Shared classification"), `status` ("Annotated"/"Computed"), and a real `basis` sentence naming the shared field | `src/domain/relationships.ts` | `relationships.test.ts` | Verified | **Pass** — no numeric "strength" score is shown since none is real (an honest simplification vs. the prototype's fixture `strength: 0.71`-style numbers) |
| Threads visually subordinate, thin, non-dominant | `.hx-thread-swatch` is a 16×2px line, not a filled block; threads render inside the already-subordinate identity panel | `app/globals.css` | None automated | Verified by code reading | **Pass** |

## Structure & confidence

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Representation switching works without full panel reload | Still re-runs the full Mol* `initialize()` on representation/colorMode change (unchanged from the prior audit's finding) | `src/components/StructureView.tsx` | None automated | Verified by code reading | **Partial** — functionally correct, not yet optimized to a lighter update path |
| Confidence X-Ray only for predicted, experimental shows method+resolution instead | `InspectPanel.tsx` gates the X-Ray control on `protein.structure.kind==='predicted'`; experimental shows source/evidence rows instead | `src/hooks/useStructureConfidence.ts` | None automated | Verified by code reading | **Pass** |
| Confidence coloring uses defined 4-stop gradient + visible legend | `InspectPanel.tsx` `.hx-conf-gradient` renders the exact `--conf-0..3` stops with a LOW/pLDDT/HIGH legend; Mol* itself still uses its built-in AlphaFold preset for the 3D coloring | `app/globals.css`, `InspectPanel.tsx` | None automated | Verified by code reading | **Pass** for the legend chrome; the 3D coloring itself uses Mol*'s standard preset rather than the exact 4 hex stops (unchanged limitation) |

## Protein design journey

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Staged and explicitly labeled at every stage, never a bare spinner | `DesignPanel.tsx` — 6 labeled beats, each with a body; evidence-gate beats say so explicitly in-panel | `public/data/design/proteinmpnn-6ehb.json` (real) | `src/domain/atlas.test.ts` (design-journey walk + progress-clamp tests) | Verified | **Pass** — implemented as a continuous timeline rather than 9 discrete stages; see `DESIGN_DELTA.md` §1 for the explicit, instructed rationale |
| Every design screen carries a visible precomputed/no-validation disclaimer | `.hx-design-provenance` renders on every beat, not conditionally | `DesignPanel.tsx` | None automated | Verified by code reading | **Pass** |
| No fake progress bars/shimmer/sparkle | The scrubber reflects real continuous `design.progress`; beat dots reflect real completion state; no animated shimmer anywhere in the panel | `DesignPanel.tsx` | None automated | Verified by code reading | **Pass** |

## Query vs. Ask Atlas

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Visually and behaviorally distinct entry points/response shapes | `QueryBar.tsx` (count+filter chip) vs `AskAtlas.tsx` (prose+trace) are fully separate components, separate trigger surfaces | `src/components/QueryBar.tsx`, `AskAtlas.tsx` | Playwright query test | Verified | **Pass** |
| Ask Atlas shows visible action trace for every scene-affecting answer | `AskAtlas.tsx` `.hx-ask-trace` renders `▸ scene.method(...)`-style lines built from `applyTool()`'s return value in `AtlasExperience.tsx` | `src/components/AtlasExperience.tsx` `applyTool` | None automated | Verified by code reading | **Pass** |
| Ask Atlas summonable and dismissible, never permanently docked | ⌘K / button opens `.hx-command`; Escape/backdrop-click closes it; nothing is permanently mounted when idle | `src/components/AskAtlas.tsx` | Playwright ⌘K test | Verified | **Pass** |

## Accessibility & robustness

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Visible focus states, keyboard reachability | Global `button:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--teal)}`; every interactive element in the new component set is a real `<button>`/`<input>` | `app/globals.css` | None automated | Verified by code reading | **Pass** |
| Reduced-motion disables drift, snaps tweens, doesn't break transitions | `CameraEngine.reducedMotion` forces `easeInOutCubic`→1 and disables ambient drift; wired from `prefers-reduced-motion` in `WorldCanvas`'s mount effect; CSS-level reduced-motion block also present | `src/engine/camera-navigation.ts`, `app/globals.css` | None automated (no dedicated reduced-motion Playwright test yet) | Verified by code reading | **Pass**, automated test still pending |
| Text legible over point field at any camera angle (scrims/vignette) | `.hx-scrim-top`/`.hx-scrim-bot`/`.hx-vignette` implement the exact top-150px/bottom-120px/radial-vignette contract from `DESIGN_TOKENS.md` | `app/globals.css` | None automated | Verified visually | **Pass** |
| No critical control fails hit-target/contrast scrutiny | Not formally audited (no automated contrast/hit-target tooling run this session) | — | None | Screenshots reviewed manually at 1440×900 only | **N/A-yet** |

## Light + dark parity

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Every `SCREEN_STATE_MATRIX.md` state checked in both themes | Loading, Universe, Territory, and theme-toggle-persistence verified in both themes via Playwright; Glance/Inspect/Design/Sequence/Ask-Atlas states verified in light only this session | `e2e/atlas.spec.ts` | Playwright | Partial screenshot coverage | **Partial** — dark-mode coverage of the deeper states (Glance/Inspect/Design/Sequence) is the next QA pass, see `CURRENT_STATE.md` |
