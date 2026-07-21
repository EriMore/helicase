---

## 2026-07-21T12:15:00+00:00 - Territory→Cluster rename, onboarding, protein-name truncation fix, and related polish round

**Phase:** Bugfix / iteration on a new batch of explicit product instructions

**Objective**
Rename "Territory" to "Cluster" and remove the dead Neighbourhood depth level; fix relationship-thread cluster retention, camera fit-to-view, and thread color; improve Depth Rail state legibility; add a first-run onboarding walkthrough; center the molecular viewport between the real side panels; root-cause and fix truncated protein full names; deepen the Structure/Design field fade; add confidence-scaled Procedural Motion; and raise light-mode query contrast while making query non-matches non-interactive.

**Branch correction**
The designated continuation branch (`claude/helicase-implementation-continue-ymnwif`) had been cut from `main`, which lacks the entire Territory/Neighbourhood/Depth-Rail/relationship-thread rebuild — that work only exists on `claude/final-implementation` (draft PR #11), which also carries the `docs/handoff/*` files this repository's CLAUDE.md requires reading. The branch was reset onto `origin/claude/final-implementation` before any implementation began; the 6 commits unique to the old `main`-based history (a CLAUDE.md addition and PR #7's design-trajectory work, already evaluated and rejected as a merge target in `LATEST_PR_INTEGRATION_PLAN.md`) were not carried over — nothing of lasting value was lost. See `docs/handoff/CURRENT_STATE.md` for the full account.

**Completed**
- Renamed Territory → Cluster everywhere: `SceneMode`/`SceneCommand`/`SceneState` identifiers, the copilot tool surface (`focus_territory` → `focus_cluster`), `src/domain/territories.ts` → `src/domain/clusters.ts`, all CSS classes/copy/aria text, and every test. Deliberately did not rename the unrelated, pre-existing `AtlasCluster` type (a finer-grained annotation-family grouping from the ingestion pipeline) to avoid a naming collision — documented inline and in `DESIGN_DELTA.md` item 12.
- Removed the Neighbourhood depth level (previously dead, permanently-disabled Depth Rail chrome with no feature behind it). Final hierarchy: Universe → Cluster → Protein → Structure → De novo, with De novo now its own Depth Rail row.
- Entering a cluster now hides non-cluster proteins (new `uClusterHide` shader uniform) rather than only dimming them; verified-related proteins stay visible via the existing `aExempt` exemption. Removed a stray vertical offset so the active cluster's label centers exactly on the camera's target.
- Revealing relationship threads now fits the camera to the selected protein plus every revealed related protein (new `fitToWorldPoints()` helper). Thread color is now theme-aware (white in dark mode, black in light mode) instead of fixed teal — a recorded, explicit deviation from `DESIGN_TOKENS.md`.
- Depth Rail active/available/unavailable states are now distinct CSS classes with `pointer-events: none` on unavailable rows, so hover styling can never apply to an unreachable level.
- Added a 9-step, keyboard-accessible onboarding walkthrough (orbit, pan, zoom, hover/select, enter a cluster, select a protein, Depth navigation, Query, Ask Atlas), persisted via `localStorage`, replayable from a new header `GUIDE ?` button, styled with the existing `hx-glass` panel language.
- Added `useStructureBounds` (ResizeObserver-driven) so the Mol* viewport centers between the real measured right edge of the identity panel and left edge of the Inspect/Design panel, recalculating on resize and on Inspect↔Design transitions — previously a stale constant left inset rendered the model partially hidden under the (wider) identity panel.
- Root-caused truncated protein full names to `scripts/build-atlas.mjs`'s `clean(nameRaw, 128)`, which silently hard-truncated UniProt's `protein_name` field (recommended name + every alternative name in parens) at 128 characters with no truncation marker. Raised to 320 (with a matching schema bump) and regenerated the full 75,000-record delivery profile against the live UniProt API (same release, 2026_02) — verified against the task's own example, UniProt P36027, which now ships its complete 161-character name. Added a defense-in-depth UI fix regardless: the identity panel's name now clamps to 3 lines with a measured-overflow "Show full name" toggle and a native tooltip.
- Deepened the Structure/Design field fade (Inspect 0.24→0.10, Design 0.06→0.03) and tied the petri-dish marker's opacity to the same live dim factor so it recedes with the field instead of holding constant brightness.
- Added a Procedural Motion block alongside the existing honest Rotate control: WIGGLE (Mol* trackball `rock`) and UNCERTAINTY WIGGLE (`rock` scaled by the structure's real mean AlphaFold pLDDT), disabled with an explanatory tooltip when verified confidence isn't available. No per-atom dynamics are fabricated.
- Raised light-mode query hit/non-hit contrast independently of dark mode (`queryDimNon`, unchanged in dark mode) and made query non-matches fully non-interactive (no hover, select, or label) while a query is active.
- Searched the entire branch history for MotifBench-related files; none exist — nothing to remove.

**Files**
- Added: `src/domain/clusters.ts`, `src/hooks/useOnboarding.ts`, `src/hooks/useStructureBounds.ts`, `src/components/Onboarding.tsx`.
- Removed: `src/domain/territories.ts`.
- Modified: `src/domain/atlas.ts`, `src/domain/schemas.ts`, `src/domain/copilot-tools.ts`, `src/engine/camera-navigation.ts`, `src/components/AtlasExperience.tsx`, `src/components/WorldCanvas.tsx`, `src/components/DepthRail.tsx`, `src/components/StructureView.tsx`, `src/components/InspectPanel.tsx`, `src/components/IdentityPanel.tsx`, `src/components/Header.tsx`, `src/components/AskAtlas.tsx`, `app/api/copilot/route.ts`, `app/globals.css`, `scripts/build-atlas.mjs`, `public/data/atlas/**` (regenerated), `README.md`, test files, `docs/handoff/CURRENT_STATE.md`, `docs/handoff/DESIGN_DELTA.md`, `CLAUDE.md` (restored — absent on `claude/final-implementation`).

**Validation**
- `npm run typecheck` — passed.
- `npm run lint` — passed (3 pre-existing-pattern `react-hooks/set-state-in-effect` disables added, matching `useTheme.ts`/`useSound.ts`'s established convention for one-time external-state sync).
- `npm test` — 27/27 passed, including 2 new reducer tests (`ENTER_CLUSTER`/cluster-hierarchy walk, and a fix verifying `NAV_TO_LEVEL → structure` correctly clears `design` when jumping from the design journey).
- `npm run build` — passed.
- `npm run test:e2e` — **8/8 passed** (renamed selectors + a new onboarding test), console clean, against the real production build.
- Corpus regeneration verified end-to-end: UniProt P36027 (yeast MID2, the task's own truncation example) now ships its complete 161-character name; record/PDB-linked counts are stable versus the prior build (75,000 records, 22,429 PDB-linked, same UniProt release 2026_02).
- Manual Playwright QA (both themes, two passes ~15 minutes apart) against the production server directly confirmed the 5-level Depth Rail, the name-overflow "Show full name" toggle, Procedural Motion's confidence-gated Uncertainty Wiggle, and the deepened dark-mode field fade. Two items were verified with hard measurements rather than by eye: the relationship-thread camera fit-to-view was screenshotted pulling back to frame the selection plus multiple related points connected by clearly white (dark-mode) curved lines; structure-view centering was confirmed via `getBoundingClientRect()` inside the running page — the identity panel's real right edge (`x=581`) and the Inspect panel's real left edge (`x=1274`) predict a `.structure-view` container of `left=607, right=1248`, and that is exactly what was measured. Live Mol* structure fetches to `models.rcsb.org`/`alphafold.ebi.ac.uk` were not reproducible from inside the headless browser across either pass (persistent CORS/connection-reset, while direct `curl` to both hosts succeeded every single time, including immediately after a failed in-browser attempt) — a stable sandbox proxy/browser-fetch interaction, not a regression (the fetch code itself was untouched this session) and not simple rate-limiting (it did not clear with time). See `docs/handoff/CURRENT_STATE.md` for the full account and the recommended follow-up.

**Git**
- Branch: `claude/helicase-implementation-continue-ymnwif` (reset onto `origin/claude/final-implementation`; see "Branch correction" above).
- Commit(s): pending at time of writing.
- PR: pending — will supersede `claude/final-implementation`'s draft PR #11 target once pushed.

**Codex**
- Session ID: Pending (`/feedback`)

**Next**
Re-verify the territory-vs-territory (now cluster-vs-cluster) label-collision remainder noted in `DESIGN_DELTA.md` item 4 still applies under the new hide-non-cluster behavior; consider extending the onboarding's "select a protein" step with a live highlight of the exact point being described; the longer-standing deferred items (secondary-structure coloring in the sequence tray, a credentialed Ask Atlas smoke test, automated visual-regression tests) remain open from prior rounds.

---

## 2026-07-21T09:50:00+00:00 - Live user-testing bugfix round 3: selection/query visual language, identity panel, navigation chrome, honest design-trajectory motion

**Phase:** Bugfix / iteration on live user feedback

**Objective**
Address a large, detailed batch of follow-up feedback from live testing of round 2's build: 2 console bugs plus roughly 15 distinct design/interaction change requests spanning selection feedback, query interaction, territory-label legibility, relationship threads, the identity panel, dark-mode structure contrast, Depth Rail motion, the Design trajectory panel, and navigation chrome.

**Completed**
- Fixed an SSR/`localStorage` hydration mismatch (`useTheme`, `useSound`) and a raw-`<script>` React console warning (`app/layout.tsx` → `next/script`).
- Removed the round-2 neighbourhood auto-label pool entirely — it directly conflicted with "no protein name unless hovering" and was the root cause of a reported label-clutter screenshot.
- Replaced the bracket-marker selection indicator with a custom-shader billboarded "petri dish" (frosted, rim-lit, light-direction rotates with camera) and unified selection + query-match highlighting into one shader-driven mechanism (`aMatch`: grow + glow + pulse), fading everything else via `uDimNon`.
- Removed the round-2 query grid/shell relocation layout entirely, per explicit rejection from the user — matches now highlight in place at their real positions; the camera reframes to a bounding sphere of those real positions instead.
- Added pointer-priority for territory labels over protein-dot hover/click (real `getBoundingClientRect()` checks in the canvas pointer handlers) and a glass-backed pill treatment for label contrast.
- Relationship threads: raised 3→5, fixed left-alignment (root cause: `<button>` defaults to `text-align:center`), unified to teal (removed the per-type color map), removed the large solid-color endpoint spheres (related proteins now keep normal point size, exempted from field fade via a new `aExempt` attribute).
- Restructured the Identity panel into a fixed, non-scrolling header + scrollable body, added an explicit close button, and wired both the close button and a click-on-empty-space gesture to `RETURN_ONE_LEVEL`; panel now also renders during Inspect.
- Made Mol* lighting theme-aware and boosted for dark mode; added an explicitly-labeled `ROTATE` camera-orbit toggle (not a fabricated dynamics simulation), auto-enabled during Design playback.
- Added a tasteful glitch-style hover keyframe to the Depth Rail.
- Added a real character-level sequence-diff comparison strip (two real ProteinMPNN candidates) and a `PROMPT THAT YIELDS THIS` line to the Design trajectory panel; improved the two evidence-gate beats to name a real documented artifact class that would fill each gap, without fabricating one. Deliberately skipped a 3D residue-level highlight — the candidate-sequence-to-`auth_seq_id` numbering correspondence was not verified this pass, and an incorrect highlight would be worse than an honest gap.
- Added a top-left `‹ BACK` button, made the orbit/pan/zoom nav hint persistent (was hide-after-first-hover), and right-aligned the query bar + suggestion chips.
- **Caught two regressions during this round's own validation, before they reached the user:** a real WebGL shader-precision mismatch on the newly-added `uTime` uniform (`highp` in vertex, `mediump` in fragment — fixed by an explicit `uniform highp float uTime;` in the fragment shader), and an accidental drop of the query-bar label-exclusion-zone logic from a prior round's fix (`DESIGN_DELTA.md` item 4) during the `WorldCanvas.tsx` rewrite — re-added and recomputed for the query bar's new right-anchored position. Both were root-caused with the same tools used in prior rounds (Playwright console-error capture and a direct `inputValue()`-before/after diagnostic script), not guessed at.
- Recorded every deliberate deviation from the original design spec introduced this round in `docs/handoff/DESIGN_DELTA.md` (items 8–11), including one flagged for re-confirmation against the user's literal request (glass-backed labels vs. literal dynamic per-pixel text color).

**Validation**
- `npm run typecheck`, `npm run lint`, `npm test` (26/26) — pass.
- `npm run build` — pass.
- `npm run test:e2e` — **7/7 pass**, confirmed on a clean re-run after both regression fixes.
- Manual scripted Playwright verification (screenshots) of: selection glow/pulse/petri-dish in both themes, in-place query highlighting, territory entry with legible glass-backed labels and a working `‹ BACK`, the identity panel's close-button return-one-level behavior, and the Depth Rail hover state.

**Files**
- Modified: `app/layout.tsx`, `app/globals.css`, `src/hooks/useTheme.ts`, `src/hooks/useSound.ts`, `src/components/WorldCanvas.tsx`, `src/components/IdentityPanel.tsx`, `src/components/AtlasExperience.tsx`, `src/components/Header.tsx`, `src/components/StructureView.tsx`, `src/components/InspectPanel.tsx`, `src/components/DesignPanel.tsx`, `docs/handoff/DESIGN_DELTA.md`, `docs/handoff/CURRENT_STATE.md`.

**Git**
- Branch: `claude/final-implementation`.
- PR: #11 (draft, targeting `integration/claude-handoff`).

**Codex**
- Session ID: Pending (/feedback)

**Next**
Re-confirm the territory-label glass-backing substitution against the user's literal request. If pursued further: source a real RFdiffusion backbone trajectory and/or real AlphaFold2/ESMFold predictions for the two ProteinMPNN 6EHB candidates (with verified residue-numbering correspondence) to fully animate the Design trajectory panel.

---

## 2026-07-21T01:20:00+00:00 - Claude Design realized on the production engine (spatial hierarchy, all design-package components)

**Phase:** Implementation

**Objective**
Make the exported Claude Design (`prototypes/claude-design-final/`, `docs/design/final/`) unmistakably real on top of the existing production engine (575,503-protein reviewed corpus, Mol*, SceneController, GPT-5.6 copilot), per `docs/handoff/CLAUDE_TAKEOVER_AUDIT.md`'s roadmap.

**Completed**
- Landed the full `DESIGN_TOKENS.md` token set as CSS custom properties (light flagship + dark "Specimen Chamber"), self-hosted Spectral + IBM Plex Mono via `next/font/google`, theme persistence, and the shared `.hx-glass` panel/scrim primitives. Fixed the pre-existing `eslint.config.mjs` gap that was linting the vendored `prototypes/**` reference bundle. Added a CI workflow gating PRs against `main`/`integration/claude-handoff`.
- Rewrote the camera engine (`src/engine/camera-navigation.ts`) to the exact spherical `{target,r,theta,phi}` contract in `MOTION_AND_CAMERA_SPEC.md`: FOV 46°, `r` clamped [40,1700], `phi` clamped [0.14,3.0], a single `easeInOutCubic` curve, the full per-transition duration table, and an exact per-depth-level snapshot/restore stack.
- Expanded `SceneMode`/`SceneCommand`/`SceneState` (`src/domain/atlas.ts`) to the design's 5-level hierarchy (`universe|territory|glance|inspect|design`), with `NAV_TO_LEVEL`/`RETURN_ONE_LEVEL` reproducing the prototype's exact per-level return rules. Rebuilt the copilot tool surface to 9 tools 1:1 with the new commands (`src/domain/copilot-tools.ts`).
- Added `src/domain/territories.ts` (6 design-facing territories grouping the real 12-region annotation taxonomy, two regions per territory) so the universe ships the design's 6-hue palette without discarding real classification resolution.
- Rewrote `WorldCanvas.tsx`: real 75,000-protein point field (no synthetic aggregate layer), territory ×1.7 expansion, `dimNon` dimming, idle-gated ambient drift, double-click focus, canvas-drawn bracket-marker selection, and camera choreography driven directly off `SceneState.lastCommand`.
- Built every component in `docs/design/final/COMPONENT_INVENTORY.md`: `Header`, `DepthRail`, `QueryBar`, `IdentityPanel` (Glance/Learn tabs + relationship threads), `InspectPanel`, `DesignPanel`, `SequenceTray`, `AskAtlas` (⌘K-summonable, visible action trace, auto-dismiss), `LoadingScreen` (static logo, no spin).
- Added `app/api/atlas/protein` + `useProteinDetail`: a real per-protein UniProt fetch (gene, function, subcellular location, disease, domains, canonical sequence) used by Glance/Learn/Sequence — fetched only for the selected protein, keeping the bulk 75k profile on its existing light field set.
- Added `src/domain/relationships.ts`: relationship threads computed from real signals only (shared UniProt family annotation, or this codebase's own region classification), never an invented edge, with unit tests.
- Extended `StructureView.tsx`: Spacefill representation, real chain-id/UniProt-domain-range color modes, and a Mol* click→sequence residue bridge (`plugin.behaviors.interaction.click`) for genuine bidirectional structure/sequence selection.
- Implemented the protein-design journey as a continuous, six-beat, real-time spatial timeline (play/pause/scrub) rather than the design package's discrete stage clicks, per explicit instruction for this pass; beats without a real artifact (backbone generation, predicted fold/metrics) render as honest evidence gates.
- Added a sound system (`src/hooks/useSound.ts`) matching `SOUND_SPEC.md`'s cue table/envelope, persisted, off by default.
- Removed the Codex-era cold-open landing screen and its dead fixture module (`src/domain/fixtures.ts`) — the design has no such screen.
- Found and fixed two real bugs via a Playwright smoke pass against the production build: an undeclared `color` attribute in the point-field vertex shader, and a text-selection regression from drag-orbiting over UI chrome.

**Validation**
- `npm run typecheck`, `npm run lint`, `npm test` (26 tests / 4 files), `npm run build` — all pass.
- Playwright smoke pass against `npm run start`: Universe renders the real point field in both themes; simulated territory-label click verified expansion/dim/camera-reframe/rail-update; theme toggle verified; zero browser console errors after the shader fix.
- Full detail, known gaps, and the exact next task are in `docs/handoff/CURRENT_STATE.md`. Deliberate deviations from the design package are recorded in `docs/handoff/DESIGN_DELTA.md`.

**Git**
- Branch: `claude/final-implementation` (from `integration/claude-handoff`).
- Commits: `91ddef3` (design-token foundation), `f63ed85` (spatial hierarchy + all design-package components).
- PR: #11, draft, targeting `integration/claude-handoff`.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Playwright E2E suite for the core navigation loop, screenshot-based visual regression tests, multi-breakpoint manual QA, re-verify `docs/handoff/FINAL_ACCEPTANCE_MATRIX.md` row-by-row against the shipped build, and a credentialed Ask Atlas smoke test if `OPENAI_API_KEY` is available.

---

## 2026-07-21T01:45:00+00:00 - Playwright E2E suite, a real Ask Atlas bug found and fixed

**Phase:** Validation

**Objective**
Add durable end-to-end test coverage for the core navigation loop and re-verify `docs/handoff/FINAL_ACCEPTANCE_MATRIX.md` against the shipped build.

**Completed**
- Added `e2e/atlas.spec.ts` + `playwright.config.ts` (pre-installed headless Chromium, generous timeouts to accommodate real UniProt shard loading in this environment): loading→Universe arrival, zero-console-error arrival, theme persistence across reload, territory entry, deterministic query, Ask Atlas ⌘K/Ctrl+K summon+dismiss, sound-preference persistence.
- The suite caught a real bug on its first run: `AtlasExperience` passed `!loaderVisible && !commandOpen` as `AskAtlas`'s `visible` prop. Since `AskAtlas` returned `null` whenever `!visible`, opening the command panel (`commandOpen: true`) immediately unmounted the entire component — including the command panel it had just opened — making ⌘K appear to do nothing. Fixed: `visible` now only reflects loading state; the summon button alone hides while the panel is open.
- Diagnosed the failure methodically before patching: verified via a raw CDP keyboard dispatch and a synthetic `window.dispatchEvent` that the keydown handler itself fired correctly with the right modifiers, which isolated the bug to the render-visibility gate rather than event handling.
- Added `vitest.config.ts` excluding `e2e/**`, since Vitest's default include glob was also picking up the Playwright spec file and failing on `test.describe`.
- Removed two small leftovers found while landing the above: a dead no-op hidden `<form>` in `AtlasExperience.tsx`, and an orphaned CSS class reference in `DesignPanel.tsx`.
- Re-verified `docs/handoff/FINAL_ACCEPTANCE_MATRIX.md`'s Ask Atlas and Light+dark-parity rows against the now-passing suite.

**Validation**
- `npm run typecheck`, `npm run lint`, `npm test` (26 tests / 4 files) — pass.
- `npm run test:e2e` — **7/7 pass** (`e2e/atlas.spec.ts`), ~4.4 minutes total against the real production build with real UniProt data loading.
- `npm run build` — pass.

**Git**
- Branch: `claude/final-implementation`.
- Commits: `e30b235` (E2E suite + Ask Atlas fix), plus the doc updates in this entry.
- PR: #11, draft, targeting `integration/claude-handoff`.

**Codex**
- Session ID: Pending (/feedback)

**Next**
See `docs/handoff/CURRENT_STATE.md` "Exact next task" — reduced-motion/wider-breakpoint automated coverage, a credentialed Ask Atlas run if `OPENAI_API_KEY` becomes available, and the territory-label-overlap polish item in `DESIGN_DELTA.md`.

---

## 2026-07-21T06:45:00+00:00 - Live user-testing bugfix round: 12 real defects root-caused and fixed

**Phase:** Validation / hardening, driven by direct human testing of the shipped build

**Objective**
The user ran the actual production build (not just this session's automated checks) and reported a concrete list of defects. Root-cause and fix every one — no cosmetic patches over unfixed root causes.

**Completed**
- **Mol* infinite reinit loop → the session's most severe bug.** `structureDomains` in `AtlasExperience.tsx` was recomputed via `.map()` on every render, giving it a new array reference roughly once a second (driven by the FPS-counter callback). `StructureView`'s Mol* mount `useEffect` depended on that array directly, so it fully tore down and rebuilt the entire Mol* plugin on that same ~1s cadence — the reported "screen keeps glitching," the flood of `Symbol 'ma.quality-assessment.pLDDT' already added` console warnings, and (very likely, given rapid WebGL-context churn) the reported "Universe goes blank after leaving a broken protein view" via concurrent-context exhaustion. Fixed with `useMemo` keyed on the (correctly stable) `detail` object.
- **Universe "too dense and bunched into the center."** Diagnosed as a real scale mismatch, not a display bug: the real corpus's spatialization coordinates (`src/domain/spatialization.ts`) live within ~±100 world units, inherited from the pre-Claude-Design engine's `r ∈ [8,520]` camera clamp, while the design's camera contract (`MOTION_AND_CAMERA_SPEC.md`) uses much larger absolute distances tuned against the prototype's bigger synthetic dataset. Added `WORLD_SCALE = 6` + a `worldPosition()` helper (`src/domain/territories.ts`) applied at every point real protein/territory coordinates enter world space in `WorldCanvas.tsx`, and raised the default arrival framing from the spec's literal r:640 to r:900 to give the six genuinely-unevenly-sized real territories room to read as distinct. Recorded as `DESIGN_DELTA.md` item 6 — a deliberate, reasoned deviation, not an oversight.
- **Dark-mode points blowing out to solid white.** 75,000 points at additive blending is far denser than the prototype's 13,400; added a dark-mode-only alpha damping term in the point fragment shader.
- **Header logo "too small."** Root cause: an inline style was squashing the *combined* icon+wordmark lockup SVG to 20px tall, shrinking the icon glyph inside it far below its intended size. Copied the real wordmark PNGs out of the prototype's asset bundle (they existed but were never copied into `public/brand/logo/`) and rebuilt the header to show the icon-only mark at its correct 28px plus the real wordmark at 12px, closing the previously-accepted "combined lockup" deviation.
- **Ask Atlas / query results "obscured by the rest of the proteins."** Two compounding bugs, both fixed: (a) the per-frame point-reflow lerp used a flat, frame-count-based factor instead of a `dt`-scaled one, so it converged far too slowly whenever the actual frame rate dropped — a genuine, independently-real robustness bug, not just a symptom of this sandbox's software renderer; (b) `applyQueryLayout` barely relocated matched points at all. Rewrote it so matches resolve onto a compact, individually-legible grid directly in front of the query-framing camera while non-matches are pushed onto a distant shell — verified via before/after screenshot that 240 real query matches are now clearly legible and separated from dimmed, receded non-matches.
- **Relationship threads had no 3D visualization at all** — only `IdentityPanel`'s text list existed; `WorldCanvas.tsx` never drew the curved connecting lines the design specifies. Added a `threadGroup` using the same real `computeRelationshipThreads()` signal the panel already calls, drawing colored curved lines + endpoint dots from the selection marker to each related protein's real position. Verified visually with a real selected protein (ALOX15/P39654) showing 3 real "Shared classification" threads.
- **"Neighbourhood level is useless."** Per the design, Neighbourhood is correctly not a separate navigable `SceneMode` (confirmed: the Depth Rail's Neighbourhood entry is deliberately inert by design) — but production had nothing filling the *interaction* the design specifies for it ("local groups/hero labels resolve into view as camera moves"). Added a pooled, throttled nearest-protein label system inside Territory mode; verified two real protein name labels resolving into view after entering a territory.
- **Persistent ambient sound (new capability, explicit user request).** `SOUND_SPEC.md` explicitly forbids ambience. The user directly asked for an ambient option during live testing. Added a second, independent, off-by-default `AMBIENT` toggle (a very quiet generative two-oscillator drone, `src/hooks/useSound.ts`) alongside the untouched discrete cue-sound toggle. Recorded as `DESIGN_DELTA.md` item 7 — the reconciliation rule defers to a direct, live human instruction over the written spec here.
- **Protein-design journey undiscoverable.** Only UniProt A5F934/PDB 6EHB carries a real precomputed design trajectory; nothing pointed a user toward it. Added a "protein design example" Query-bar suggestion chip that searches the exact accession. Verified the entire path end-to-end: search → select → Glance → Inspect → Design panel showing real 6EHB provenance and the continuous 6-beat playback.
- Updated the `CameraEngine` unit test asserting the old literal r:640 home framing to the new, intentional r:900.

**Diagnostic method, not guessing**
Every fix above was root-caused before being patched — e.g. the "3 FPS" reading during investigation was confirmed via `WEBGL_debug_renderer_info` to be this sandbox's software (SwiftShader) WebGL rasterizer, not a code regression, so no code was changed purely to move that number; the reflow-timing fix was made because a flat per-frame factor is independently a real bug on any slow frame rate, which happened to also be what made the diagnosis legible in this environment.

**Validation**
- `npm run typecheck`, `npm run lint`, `npm test` (26/26, including the updated camera home-framing test) — pass.
- `npm run build` — pass.
- `npm run test:e2e` — 7/7 Playwright tests pass against the rebuilt production build.
- Scripted Playwright verification (screenshotted) of all 10 fixes above at 1920×1080, both themes: Universe arrival composition, territory entry + neighbourhood labels, dark-mode point rendering, query legibility, thread-line rendering with a real protein, and the full design-journey path.

**Git**
- Branch: `claude/final-implementation`.
- PR: #11, draft, targeting `integration/claude-handoff`.

**Codex**
- Session ID: Pending (/feedback)

**Next**
See `docs/handoff/CURRENT_STATE.md` "Exact next task" — automated reduced-motion/2560×1440 e2e coverage, a credentialed Ask Atlas run if `OPENAI_API_KEY` becomes available, and a screen-space label-collision pass for the remaining `DESIGN_DELTA.md` item 3.

---

## 2026-07-21T07:00:00+00:00 - Follow-up: territory label vs. query bar collision, e2e fully green

**Phase:** Validation, direct follow-up to the previous entry

**Objective**
The prior bugfix commit's pointer-events fix wasn't sufficient — the e2e suite's territory-entry test still failed on re-run. Root-cause precisely rather than re-guessing.

**Completed**
- Used `page.evaluate(() => document.elementFromPoint(x, y))` at the exact center of the territory label's bounding box to find out, with certainty, what the browser itself considered the topmost element there. Result: a real `.hx-suggestion-chip` button ("membrane receptors"), not empty flex-gap space — meaning the previous commit's pointer-events fix (which only addressed dead space) was solving a different, smaller problem than the one actually causing the test to fail.
- Fixed properly: `projectLabels()` now computes the query bar's known screen-space rectangle each frame and nudges a territory label below it if their positions would coincide, rather than trying to win a z-order fight between two legitimately-interactive elements.
- Verified the fix directly (not by assumption) with the same `elementFromPoint` diagnostic: the label's projected position moved from y:138 (inside the chip row) to y:230 (below it), and `elementFromPoint` at the new position correctly resolves to the label's own `.hx-label-name` div.
- Also diagnosed and worked around an unrelated environment issue during this pass: a stray `next-server` process from an earlier manual test survived process kills targeted by name pattern and caused a completely unrelated catastrophic e2e failure (`.hx-loading` never appearing at all) on one intermediate run. Confirmed via `ps`/`ss` that killing it and restarting cleanly (using the harness's `run_in_background` rather than manual `nohup &`/`disown`, which was silently failing to launch in this sandbox) resolved it — not a code issue, but worth noting for future sessions in this environment.

**Validation**
- `npm run typecheck`, `npm run lint`, `npm test` (26/26) — pass.
- `npm run test:e2e` — **7/7 pass**, confirmed clean (4.3 minutes, all green, including the previously-flaky territory-entry test).

**Git**
- Branch: `claude/final-implementation`.
- Commits: `988ad92` (bugfix round), `06f79e1` (this fix).
- PR: #11, draft, targeting `integration/claude-handoff`.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Same as the prior entry: automated reduced-motion/2560×1440 e2e coverage, a credentialed Ask Atlas run if `OPENAI_API_KEY` becomes available, and a *territory-vs-territory* (not territory-vs-query-bar, now fixed) label-collision pass.

---

## 2026-07-20T05:40:00+01:00 - Functional-completion closeout

**Phase:** Validation and publication

**Completed**
- Froze the canonical UI integration contract and kept Three.js, Mol*, scientific adapters, camera policy, and validated scene commands independent of the replaceable shell.
- Added RCSB/SIFTS chain and residue-coverage metadata, renderer-agnostic representation/ligand controls, author-numbered residue focus, full-protein camera framing, retry, and clean structure disposal.
- Added runtime validation for SceneController commands, worker output, copilot stream events, structure metadata, and all existing biological payloads.
- Added complete scene context to the streamed Responses API request, explicit stream cancellation, recoverable tool/precondition errors, and a scientifically honest local mode.
- Added focus-visible/reduced-motion/keyboard behavior, isolated shell errors, loading/retry/cancellation paths, security headers, environment/deployment documentation, and production dependency remediation.
- Preserved the official attributable ProteinMPNN 6EHB journey without generating or searching for additional designs.
- Closed the 48-row audit at 39 complete, 9 evidence-backed blocked, 0 partial, and 0 missing.

**Validation**
- `npm run typecheck` - passed.
- `npm test` - 15 tests passed across 3 files.
- `npm run lint` - passed.
- `npm run build` - passed with Next.js 16.2.10 and Webpack.
- `npm audit` - 0 vulnerabilities after upgrading Next.js and pinning patched PostCSS 8.5.10.
- Production QA at 1440 x 900 - passed: universe navigation, complete-corpus query/materialization, predicted and experimental Mol* inspection, verified pLDDT X-Ray and residue focus, RCSB/SIFTS coverage, existing ProteinMPNN candidate/boundary traversal, streamed local copilot tool execution, and preserved universe return context.
- Browser console - 0 warnings/errors. Security headers verified on the production response.

**Evidence-backed blockers**
- Credentialed GPT-5.6 smoke testing requires an external `OPENAI_API_KEY` and model entitlement.
- Learned/hybrid embeddings, scored structural neighbours, PAE interaction, release-keyed IndexedDB, and verified cross-source chain isolation require separately scoped data, infrastructure, or interaction work recorded in the completion audit.
- Total serializable scene-store migration is held for the final presentation integration; the stable replacement contract is complete.

**Git**
- Branch: `agent/functional-completion`.
- Closeout commit: `6ef1320` (`Complete Atlas engine contracts and production hardening`).
- PR: #6, to be updated and marked ready after the publication commit.

---

## 2026-07-20T04:05:00+01:00 - Verified design journey and streamed copilot checkpoint

**Phase:** Functional completion

**Objective**
Replace decorative design choreography with attributable scientific artifacts and make GPT scene control streamed, cancellable and runtime validated.

**Completed**
- Imported the official ProteinMPNN example 6 sequence redesign for reviewed UniProt A5F934 / experimental PDB 6EHB, including exact candidate sequences, scores, sequence recovery, model version, repository commit, seed, temperature, source URLs and limitations.
- Made the evidence boundary explicit: the journey ends before structure prediction, affinity, interface or wet-lab validation because the official example supplies none of those artifacts.
- Added reversible stage navigation, candidate selection and return-to-source commands through the SceneController reducer.
- Replaced unvalidated copilot casts with strict Zod argument schemas and a bounded nine-tool surface.
- Added GPT-5.6 Responses API streaming through a local NDJSON protocol, stale-request abortion, complete query/protein/confidence/design context and an explicit offline stream using the same tool protocol.
- Revalidated Mol* Confidence X-Ray after synchronous plugin disposal; no browser warnings or errors remained.

**Validation**
- `npm run typecheck` - passed.
- `npm test` - 8 tests passed, including the shipped design artifact and rejected copilot arguments.
- `npm run lint` - passed.
- `npm run build` - passed.
- Manual QA at 1440 x 900: A5F934 resolved from the complete reviewed corpus, PDB 6EHB rendered, both ProteinMPNN candidates and the validation boundary were traversable, offline copilot streamed and launched the journey, predicted A0A0R4IVV0 Confidence X-Ray rendered mean pLDDT 89.0 with three very-low-confidence ranges, and the console contained zero warnings/errors.

**Scientific boundary**
- 3HTN was rejected as the showcase target because its linked accession was not returned by the reviewed-UniProt corpus. 6EHB maps to reviewed accession A5F934 and has an official ProteinMPNN homooligomer output, so it remains discoverable through the production Atlas query path.

**Git**
- Branch: `agent/functional-completion`, stacked on `agent/protein-universe` pending PR #5.
- Commit: pending checkpoint commit.

**Next**
Complete residue/chain structure controls, structural-neighbour navigation, persistence/recovery, credentialed GPT QA and end-to-end automation.

---

## 2026-07-20T03:10:00+01:00 - Functional completion: engine, corpus and confidence checkpoint

**Phase:** Functional completion

**Objective**
Establish the replaceable UI boundary, complete spatial navigation, make the full reviewed corpus addressable, and replace the confidence placeholder with verified per-residue AlphaFold data.

**Completed**
- Added the 48-capability completion audit and canonical UI integration contract; recorded that this branch is stacked because PR #5 remains an open draft and `main` does not contain the protein-universe milestone.
- Extracted a reusable camera engine with orbit, truck, pointer-centered dolly, semantic speed/limits, deterministic focus, cancellation, history, home/reset/back, keyboard controls, context restoration and reduced-motion behavior.
- Added runtime-validated scientific schemas for Atlas data, corpus responses, confidence datasets and provenance-carrying design trajectories.
- Added a server-side complete-corpus UniProt adapter with bounded queries, release/total-result provenance, cursor support, cancellation and recoverable local-profile fallback.
- Materialized remote reviewed-UniProt results into stable deterministic Atlas addresses and the live worker/GPU dataset.
- Added an official AlphaFold metadata/confidence adapter that preserves residue numbering, model version, source URL, pLDDT ranges, PAE URL and interpretation limits.
- Registered Mol* model-archive quality assessment explicitly and enabled its pLDDT preset only for predicted structures. Experimental structures remain correctly ineligible.

**Validation**
- `npm run typecheck` - passed.
- `npm test` - 6 tests passed.
- `npm run lint` - passed.
- `npm run build` - passed; API routes are dynamic and the page remains statically rendered.
- Manual QA at 1440 x 900: 75,000-protein field held 60 FPS; complete-corpus query `P69905` resolved and materialized; experimental PDB 1A00 rendered; predicted A0A0R4IVV0 resolved mean pLDDT 89.0 and three very-low-confidence ranges.
- Console was clean before X-Ray. A duplicate Mol* custom-property warning on mode remount was identified and corrected by disposing plugin registrations before deferred nested React teardown; revalidation remains in the next checkpoint.

**Git**
- Branch: `agent/functional-completion`, stacked on `agent/protein-universe` pending merge of PR #5.
- Commit: pending checkpoint commit.

**Next**
Complete the provenance design journey, streaming validated GPT-5.6 tool path, structure residue controls, failure recovery and end-to-end coverage.

---

## 2026-07-18T20:25:00+01:00 - Protein universe milestone

**Phase:** Full-scale Atlas implementation

**Objective**
Replace the direct-to-1EMA integration proof with a navigable, queryable, multiscale universe built from real protein records.

**Completed**
- Built an unrestricted reviewed-UniProt ingestion pipeline with deterministic annotation-family spatialization, provenance-bearing manifests, progressive shards, and CI artifacts.
- Measured the complete reviewed corpus at 575,503 proteins, 55,558 annotation families, 39,017 PDB-linked records, and 241 MB uncompressed.
- Published a measured browser delivery profile containing 75,000 proteins, 19,451 families, 22,429 PDB-linked records, and 64 shards (34 MB uncompressed). This is a deterministic derivative of the full query, not a hand-authored fixture.
- Replaced the hardcoded 1EMA entry flow with a persistent Three.js universe, semantic region/family LOD, direct spatial navigation, worker-backed multi-field search, query-driven scene focus, and camera-context restoration.
- Added typed copilot commands for atlas query, region focus, protein flight, structure return, color changes, and design requests through the shared SceneController boundary.
- Deferred molecular coordinates until selection, then resolved real RCSB BinaryCIF or AlphaFold mmCIF structures in Mol*. Added an explicit caveat that linked PDB records may cover only a domain, chain, or complex fragment.
- Corrected a Mol* nested-React-root teardown race found during universe-to-structure-to-universe QA.
- Extended the reference synthesis with AIR and Wembi while preserving Helicase's camera-as-understanding interaction model.

**Scale decision**
- Direct local UniProt requests were blocked by environment DNS (`ERR_NAME_NOT_RESOLVED` / `Could not resolve host`). GitHub Actions completed the same unrestricted query in 131 seconds.
- The full 241 MB static output was retained as the authoritative build artifact. The 75k profile was selected for live delivery after measuring initial transfer, JSON parsing, and browser-memory implications; all contracts remain scale-independent.

**Validation**
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run build` - passed with Next.js 16.1.6 and Webpack.
- Full-data production QA at 1440 x 900 - passed.
- 75,000 records reached ready state in 4.8 seconds on the local production server.
- Universe and query states held 60 FPS; observed heap settled near 98-158 MB after loading, with a transient 210 MB peak during dev/HMR query reconstruction.
- Multi-constraint query `membrane proteins in humans` returned 240 Homo sapiens matches and reduced the scene to 240 addressable protein points.
- RCSB PDB 5X1G and AlphaFold A0A075F7E9 both rendered successfully in Mol*.
- Query clear restored the pre-query universe framing; structure return restored query and camera context.
- Browser console - zero warnings or errors in the final production journey.

**Git**
- Branch: `agent/protein-universe`.
- Logical commits include full-corpus pipeline, browser delivery profile, universe renderer/query system, Mol* teardown correction, and measured architecture/design documentation.
- Draft PR: pending final push.

**Next**
Replace annotation-family coordinates with a versioned learned embedding projection while preserving IDs and shard contracts; add verified structure coverage and AlphaFold confidence extraction before enabling Confidence X-ray.

---

## 2026-07-18T17:32:39+01:00 — Mol* structure presentation correction

**Phase:** Blocking visual defect

**Objective**
Make the cited 1EMA structure scientifically legible, visually native to Atlas, and reliable across the universe-to-structure transition.

**Completed**
- Replaced the default Mol* presentation with an opaque, high-quality cartoon polymer representation and element-colored ball-and-stick ligand support.
- Corrected BinaryCIF loading, camera reset, whole-structure framing, exposure, ambient light, interior darkening, and postprocessing.
- Removed the white/checkered Mol* viewport, duplicate procedural molecule, and CSS class collisions that distorted the Atlas copilot.
- Isolated each Mol* React root so remounts and scene round trips do not reuse a stale container.
- Moved structure actions and provenance status outside the molecular focal area while retaining the RCSB 1EMA citation and experimental-evidence boundary.
- Pinned production builds to Webpack after Turbopack emitted a missing Mol* module factory despite compiling successfully.

**Files**
- Added: None.
- Modified: `.gitignore`, `app/globals.css`, `app/layout.tsx`, `package.json`, `src/components/AtlasExperience.tsx`, `src/components/StructureView.tsx`, `src/components/WorldCanvas.tsx`.
- Removed: None.

**Validation**
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — passed with Next.js 16.1.6 and Webpack.
- Manual production QA — passed at 1440 x 900; 1EMA remained centered and complete through universe -> structure -> universe -> structure.
- Browser console — zero errors; one upstream Three.js deprecation warning remains.

**Git**
- Branch: `agent/atlas-foundation`.
- Commit(s): Branch head — `Fix Mol* structure presentation`.
- PR: Existing feature branch; no PR requested for this correction.
- Status: Validated and ready to commit and push.

**Codex**
- Session ID: Pending (`/feedback`).

**Next**
Add a verified AlphaFold entry and confidence fixture before enabling the confidence X-ray for predicted structures.

---

## 2026-07-18T16:30:00+01:00 — Atlas foundation

**Phase:** Implementation

**Objective**
Establish the first runnable, single-screen Atlas experience and its typed scene-command boundary.

**Completed**
- Added strict Next.js/TypeScript application foundation and an interactive Three.js protein-universe scene.
- Implemented deterministic map → structure → confidence X-ray → design-reveal choreography.
- Added server-side GPT-5.6 Responses API route with bounded tool schemas and an explicitly labelled offline fallback.
- Copied unmodified canonical logo variants into `public/brand/logo/` for application use.
- Kept design playback visibly labelled as a development choreography fixture pending verified scientific trajectory data.

**Files**
- Added: application foundation, domain contracts, scene renderer, copilot API route, public brand derivatives.
- Modified: README.
- Removed: None.

**Git**
- Branch: agent/atlas-foundation.
- Commit(s): Pending at the time of log entry.
- PR: None — `gh pr create` was rejected: `Automatic approval review failed: You've hit your usage limit. Upgrade to Plus to continue using Codex (https://chatgpt.com/explore/plus), or try again at Aug 17th, 2026 3:48 PM.`
- Status: Local implementation validated; feature branch prepared.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Import real Mol* structure rendering and verified precomputed design trajectories; then enable a credentialed GPT-5.6 demo flow.

---

## 2026-07-18T16:08:34+01:00 — Real structure adapter and evidence correction

**Phase:** Implementation

**Objective**  
Replace the molecular silhouette path with a browser-native Mol* adapter while removing unsupported scientific claims from the current fixture.

**Completed**
- Added a client-only Mol* adapter that downloads and renders the cited RCSB BinaryCIF structure for PDB 1EMA.
- Made the density field, experimental evidence, unavailable pLDDT confidence, and design choreography fixture explicit in the interface.
- Prevented the experimental PDB entry from invoking a prediction-confidence X-ray until a verified predicted fixture exists.
- Isolated Mol* from Next.js server prerendering after its plugin runtime proved browser-only.

**Files**
- Added: `src/components/StructureView.tsx`.
- Modified: molecular fixture/domain contracts, scene composition, GPT fallback, styles, package manifests, decisions.
- Removed: None.

**Git**
- Branch: agent/atlas-foundation.
- Commit(s): Pending at the time of log entry.
- PR: None — see the prior entry for the exact Codex usage-limit rejection.
- Status: Validated locally; ready to commit and push.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Commit a verified AlphaFold entry with real pLDDT data to unlock the confidence X-ray, then import the first verified RFdiffusion trajectory.

---

## 2026-07-18T16:24:00+01:00 — Publish structure adapter

**Phase:** Implementation

**Objective**
Publish the cited-structure adapter and preserve the evidence boundary for the next implementation session.

**Completed**
- Pushed the Mol* adapter and evidence correction to the feature branch.
- Confirmed typecheck, lint, and production build success.

**Files**
- Added: None.
- Modified: Development log.
- Removed: None.

**Git**
- Branch: agent/atlas-foundation.
- Commit(s): 23096d7.
- PR: None — `gh auth status` reports that the EriMore keyring token is invalid and requires `gh auth refresh -h github.com`.
- Status: Branch pushed successfully; draft PR remains blocked by GitHub CLI authentication.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Import a verified AlphaFold confidence fixture, then replace the design choreography fixture with a provenance-carrying offline trajectory.

---
