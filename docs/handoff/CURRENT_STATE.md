# Current State

Last updated: 2026-07-21 (later the same day), by Claude — final MVP stabilization pass.

## Branch (this pass)

`claude/final-mvp-stabilization`, based on the merged PR #11 implementation (`claude/final-implementation`, commit `f229e90` merge + `080bb37`). PR #12 (`claude/helicase-implementation-continue-ymnwif`, closed/unmerged) was inspected only as diagnostic evidence for what had regressed — its broad implementation was not merged, transplanted, or copied.

### Blocking bug found and fixed before anything else was testable

The corpus's last commit on the PR #11 baseline (`080bb37`, "Fix silent 128-char truncation of protein full names") shipped real UniProt names up to 320 characters, but `atlasProteinSchema.name` in `src/domain/schemas.ts` still capped at 256 — every one of the 64 shards failed Zod validation on load, so `records` never populated and the Atlas sat at 0% loading forever with no visible error. Fixed by raising the cap to 512. Diagnosed by adding temporary `console.error` logging to `useProteinAtlas.ts`'s catch blocks (removed after diagnosis, per standard practice for this repo).

### What this pass changed

See `docs/handoff/DESIGN_DELTA.md` §12–20 for the full list with rationale. In short:

- **Cluster isolation made binary** (was: dimmed, still hoverable/selectable) — both a shader-level hard-hide and a `pickProtein()` gating fix, plus a second real bug found in the same area (a JS-side `uDimNon` calculation was dimming a cluster's own members merely for being inside a cluster, unrelated to any selection).
- **User-visible "Territory" → "Cluster"; Neighbourhood removed** from the Depth Rail (it was already a permanently-disabled row implying a level that doesn't exist).
- **Deterministic protein-selection centring** — camera framing now accounts for the identity panel's and any right-side panel's real measured DOM bounds, not the raw canvas midpoint.
- **Petri-dish light-mode contrast fixed** (previous tint was nearly identical to the light fog background) and now fades correctly in Structure/Design, restoring in Protein.
- **Relationship threads**: camera now fits the selection + all thread targets on reveal; colour is theme-aware (white dark / near-black light); a shared, tested `computeThreadEndpoints()` is the single source of truth for both endpoints, with a new e2e test that projects every visible endpoint through the render camera and asserts sub-pixel agreement with the corresponding protein's own on-screen position.
- **Query-match hit-testing**: an active query now actually filters hover/click to matches only (previously any point was clickable regardless of match status), with a generous, independently-scaled hit radius; verified with a 240-match live query and a 42-point grid sweep.
- **Light-mode vibrancy restored**: `WorldCanvas.tsx`'s `THEME_TABLE.light` family hues re-saturated and the light-mode fog fade reduced — the previous palette read as near-monochrome/blackish at Universe scale.
- **Structure loading**: `StructureView.tsx` split into a download/parse effect and a representation-application effect, so switching CARTOON/SURFACE/BALL-AND-STICK/SPACEFILL, COLOR, or LIGANDS no longer redownloads or reparses the structure. Full real-network timing verification was not possible in this sandbox — see the network caveat below.
- **`CLOSE_PROTEIN`**: a new command, wired only to the identity panel's × button, that fully clears Protein/Structure/Design/Sequence state in one step (Back/Escape/Depth-Rail remain one-level-only, unchanged) and preserves an active query rather than discarding it.
- **Onboarding built from scratch** — none existed on the PR #11 baseline. A quiet, delayed, non-blocking invitation; a 7-step anchored coach-mark tour; a permanent header GUIDE entry to replay it.
- **GPT-5.6 credentialed-service messaging**: verified already correct (server-side-only key, explicit local fallback, no `NEXT_PUBLIC_` leak) and documented more explicitly in `README.md`.

### Sandbox network caveat (read before assuming structure loading is broken)

This sandbox's headless browser cannot reach `models.rcsb.org`/`alphafold.ebi.ac.uk` — confirmed via direct timing (`ERR_CONNECTION_RESET` after ~13s), even when Playwright's browser is explicitly pointed at the same egress proxy `curl` succeeds through in under a second from the same container. This is a sandbox-only browser-egress limitation, not application-level slowness or a real CORS problem — the same class of caveat as the SwiftShader/software-GPU note below. A real user's browser has no such restriction. Full first-meaningful-render timing under real network conditions is recommended as a follow-up smoke test outside this sandbox.

### Validation (this pass)

`npm run typecheck`, `npm run lint`, `npm test` (32/32), `npm run build` all pass. `npm run test:e2e` — 11/11 pass (4 new tests added: query-match reliability, relationship-thread endpoint projection, onboarding invitation/persistence, GUIDE replay).

---

## Prior branch (PR #11, preserved below for history)

`claude/final-implementation`, branched from `origin/integration/claude-handoff`. Draft PR #11 open against `integration/claude-handoff`. **Now merged** — the section below is the historical record from that implementation pass; see the stabilization summary above for what changed since.

## Latest commits

1. `91ddef3` — Design-token foundation: light/dark theme, self-hosted typography, glass-panel/scrim primitives, eslint prototype-exclusion fix, CI workflow.
2. `f63ed85` — Full spatial-hierarchy realization: SceneMode/SceneCommand rewritten to the design's 5-level hierarchy, camera engine rewritten to the exact spherical contract, WorldCanvas rewritten, every design-package component built, StructureView extended, real per-protein UniProt detail fetch, relationship threads wired, sound system added, continuous 6-beat design-journey playback.
3. `4ea6ff6` — Development log, current-state, and design-delta doc updates.
4. `e30b235` — Playwright E2E suite + a real Ask Atlas visibility bug fix.
5. `28f18a1` — Recorded the fully-green E2E suite, re-verified acceptance matrix.
6. `988ad92` — Live-user-testing bugfix round (10 defects) — see below.
7. `06f79e1` — Follow-up fix: territory labels now dodge the query bar's screen-space region (the e2e territory-entry test caught a real remaining collision after `988ad92`; root-caused via `document.elementFromPoint` at the label's exact projected position — it was landing on a real suggestion chip, not empty space).

## This session's bugfix round (live user testing)

The user ran the shipped build and reported: Mol* structure view glitching/blank, the whole Universe going blank after leaving a broken structure view, the Universe reading as "too dense and bunched into the center," a too-small header logo, illegibly tiny/overlapping territory labels, dark-mode points blowing out to white, ambient idle-spin not visibly triggering, no visible relationship-thread lines, "Neighbourhood" feeling useless, Ask Atlas query results being visually buried under non-matches, a request for persistent ambient sound, and no discoverable way to reach the protein-design journey. Every item was root-caused (not just visually papered over) and fixed:

1. **Mol* infinite reinit loop (root cause of the glitching + blank Universe).** `structureDomains` in `AtlasExperience.tsx` was rebuilt with `.map()` on every render, so its array reference changed every ~1s (driven by the FPS-counter `onMetrics` callback). `StructureView`'s Mol* mount effect depended on that array directly, so it fully tore down and recreated the entire Mol* plugin roughly once a second — visible as flashing/blank structure canvas and a flood of "Symbol already added" console warnings, and (very likely) exhausting the browser's concurrent-WebGL-context budget, which force-lost the separate WorldCanvas context too ("Universe goes blank"). Fixed with `useMemo` keyed on the stable `detail` object.
2. **Universe "too dense and bunched."** Real corpus positions (`src/domain/spatialization.ts`) live within ~±100 world units of the origin — inherited from the old engine's `r ∈ [8,520]` camera clamp — while the Claude Design's camera contract uses much larger absolute distances (arrival r≈640) tuned against the prototype's own bigger synthetic point field. Fixed by scaling every real position by `WORLD_SCALE = 6` at the render boundary only (`src/domain/territories.ts` → `worldPosition()`, used throughout `WorldCanvas.tsx`) and raising the default arrival/home framing from r:640 to r:900 to give the six (genuinely unevenly sized) territories room to read as distinct. See `DESIGN_DELTA.md` item 6.
3. **Dark-mode points blowing out to solid white.** 75,000 additively-blended points is far denser than the prototype's 13,400; dampened per-point alpha specifically in dark mode inside the point fragment shader.
4. **Header logo too small.** The header was squeezing the full icon+wordmark lockup SVG down to 20px tall (inline style override), shrinking the icon glyph inside it to near-invisibility. Fixed by using the real icon-only mark at its correct 28px size plus the real wordmark PNGs (copied in from the prototype's asset bundle, previously never copied to `public/brand/logo/`) at 12px — closing `DESIGN_DELTA.md` item 2 in the process.
5. **Query results "obscured by the rest of the proteins."** Two compounding bugs: (a) the point-field reflow lerp used a flat per-frame factor (`×0.08`) instead of a frame-rate-independent one, so on anything slower than ~60fps it visibly failed to converge; fixed to a `dt`-scaled exponential factor. (b) `applyQueryLayout` barely relocated matches at all; rewritten so matches resolve onto a compact, individually legible grid in front of the query-framing camera while non-matches are pushed onto a distant shell.
6. **No relationship-thread lines.** The 3D curved-line visualization was simply never implemented in `WorldCanvas.tsx` (only the text list in `IdentityPanel` existed). Added a `threadGroup` that calls the same `computeRelationshipThreads()` the panel uses and draws curved, colored lines + endpoint dots from the selection marker to each related protein's real position.
7. **"Neighbourhood" felt useless.** Added a pooled, throttled nearest-protein label system that surfaces real protein names as the camera approaches within a territory — the "local groups/hero labels resolve into view" behavior `SCREEN_STATE_MATRIX.md` specifies for Neighbourhood, which previously only existed for a single hovered point.
8. **Ambient idle-spin "not deterministic."** The mechanism itself was correct (idle timer + mode gate); it was imperceptible because the whole point cloud was a tiny central smudge (see item 2). Confirmed visually working (screenshot diff after 4.5s idle) once the scale fix landed.
9. **Persistent ambient sound (new feature request).** Added a second, independent, off-by-default `AMBIENT` toggle in the header — a very quiet generative drone — alongside the existing discrete cue-sound toggle. `SOUND_SPEC.md` explicitly forbids ambience; this is a deliberate, recorded deviation per direct user request. See `DESIGN_DELTA.md` item 7.
10. **Protein-design journey undiscoverable.** Only one protein (UniProt A5F934 / PDB 6EHB) has a real precomputed design trajectory, and there was no way to find it without knowing the accession. Added a "protein design example" suggestion chip to the Query bar that searches for it directly.

All fixes were verified end-to-end with Playwright against the real production build (not just read as "should work"): selection → Glance → Inspect → Design journey walked all the way through with real UniProt data and real 6EHB provenance; territory entry, neighbourhood labels, and relationship threads all screenshotted and visually confirmed; query legibility screenshotted before/after.

**Environment note:** this sandbox's headless Chromium has no real GPU (`SwiftShader`/Vulkan software rasterizer — confirmed via `WEBGL_debug_renderer_info`), so its FPS counter reads ~2–3 FPS at 75,000 additively-blended points. That is a software-rendering artifact of this test environment, not a code regression — real GPU hardware renders this shader workload natively. No code changes were made purely to chase that number; the frame-rate-independence fix in item 5 was made because it's independently correct (a flat per-frame factor is a latent bug on any slow frame rate, not just this one), not to move the FPS counter.

## What's implemented and verified this session

- `npm run typecheck`, `npm run lint`, `npm test` (26 tests across 4 files, including an updated `CameraEngine` home-framing test for r:900), `npm run build` all pass.
- **`npm run test:e2e` — 7/7 Playwright tests pass**, confirmed on a clean re-run after `06f79e1` (`entering a territory expands the depth rail and shows a return hint` now passes reliably — verified 4.3 minutes, all green).
- Manual, scripted Playwright verification of every one of the 10 fixes above, screenshotted at 1920×1080 in both themes, plus a direct `document.elementFromPoint` diagnostic proving the territory-label click lands on the label itself (not a suggestion chip) after `06f79e1`.

## Known gaps / deferred work (see `docs/handoff/DESIGN_DELTA.md` for the full detail)

1. Design journey is a continuous 6-beat timeline rather than the prototype's 9 discrete stages — intentional, per explicit task instruction.
2. No secondary-structure coloring in the sequence tray (no real, non-sparse data source wired yet).
3. Territory labels can still occasionally touch *each other* (not the query bar, which now has a dedicated exclusion zone) at some camera angles — improved this session, not fully eliminated; a proper fix is general screen-space label-collision resolution.
4. No "sourced fact" callout in Glance (no real per-protein source for it beyond the old 7 prototype fixtures).
5. Not yet done: screenshot-based automated visual-regression tests, an automated reduced-motion test, a credentialed Ask Atlas smoke test (no `OPENAI_API_KEY` available this session).
6. The query grid/shell layout constants (`QUERY_PULL`, `QUERY_SPACING`, `QUERY_SHELL_RADIUS` in `WorldCanvas.tsx`) and the query-bar exclusion-zone rectangle in `projectLabels()` are hand-tuned and not unit-tested in isolation (covered indirectly by e2e + this session's manual screenshots).
7. Mol* representation/color-mode switching still re-runs the full plugin `initialize()` rather than a lighter update path (pre-existing).

## Bugfix round 3 (this session, live user testing)

The user reported a large, detailed batch of follow-up feedback after testing round 2's build: two console bugs (an SSR/localStorage hydration mismatch on the SOUND toggle, and a raw-`<script>` React console warning), plus roughly fifteen distinct design/interaction change requests. All were addressed:

1. **SSR hydration mismatch (SOUND toggle) + raw `<script>` warning.** `useTheme`/`useSound` synchronously read `localStorage` in their `useState` initializer, which differs between server and client render passes. Fixed by always initializing to the SSR-safe default and syncing from the real DOM/`localStorage` state in a mount-only effect. `app/layout.tsx`'s raw `<script dangerouslySetInnerHTML>` replaced with `next/script`'s `<Script strategy="beforeInteractive">`.
2. **Neighbourhood label-pool clutter.** The pooled auto-label system added in round 2 directly conflicted with the user's explicit "no protein name unless hovering" requirement and was root-caused as the source of the reported dense, overlapping-text screenshot. Removed entirely; hover-only single-label display restored, now active in Glance mode too.
3. **Selection feedback redesigned.** Replaced the HUD-style bracket marker with a custom-shader, billboarded "petri dish" (frosted, rim-lit, light-direction rotates with camera). Selected/matched points now grow, glow (teal→theme-aware glow color mix), and pulse via a shared `aMatch` shader attribute — both for single-protein selection and query matches. See `DESIGN_DELTA.md` item 8.
4. **Query interaction reworked.** The grid/shell relocation layout from round 2 was explicitly rejected by the user ("I hate the new structured grid"). Removed entirely — matches now highlight in place (same shader path as selection) and the camera reframes to a bounding sphere of their real, unmoved positions. See `DESIGN_DELTA.md` item 8.
5. **Territory-label legibility + pointer priority.** Labels now render on a glass-backed pill for contrast against any point-field color/density behind them, and the canvas pointer handlers check every territory label's real screen rect before running protein-hover/selection raycasting, so a label (and its ENTER control) always wins a pointer conflict over a protein dot underneath. See `DESIGN_DELTA.md` item 9 (flags this as a substitution for the user's literal "dynamic per-pixel text color" request, worth re-confirming).
6. **Relationship threads.** Raised from 3 to 5, left-aligned (root cause: `<button>` elements default to centered text — fixed with explicit CSS), unified to teal throughout (removed the per-type color map), and the large solid-color endpoint spheres removed — related proteins keep their normal point size and are exempted from the field-wide fade via a new `aExempt` shader attribute instead.
7. **Identity panel restructured.** Split into a fixed, non-scrolling header (id/name/organism/evidence/tabs) and a scrollable body (tab content + threads + actions), added an explicit close button, and wired both the close button and a click-on-empty-space-while-selected gesture to return one depth level (`RETURN_ONE_LEVEL`). Panel now also renders during Inspect, not just Glance.
8. **Dark-mode structure contrast + honest rotation toggle.** Mol* lighting (`exposure`/`ambientIntensity`/`interiorDarkening`) is now theme-aware and boosted for dark mode. Added an explicitly-labeled `ROTATE` toggle (a camera-orbit spin, not a fabricated dynamics simulation) in Inspect, auto-enabled during Design playback. See `DESIGN_DELTA.md` item 10.
9. **Depth Rail hover motion.** Added a brief, tasteful glitch-style keyframe animation on label hover plus a teal glow on the depth dot, so the rail "feels alive" per the user's request.
10. **Design trajectory panel.** Added a real character-level sequence-diff comparison strip between the two real ProteinMPNN candidates (differing positions highlighted in teal) in the sequence/compare beats, and a `PROMPT THAT YIELDS THIS` line surfacing the design's specification text. The two evidence-gate beats now also name a real, documented artifact class that would fill each gap. Deliberately did not attempt a 3D residue-level highlight (unverified numbering correspondence to the deposited structure — see `DESIGN_DELTA.md` item 11). Full backbone/fold-frame animation from a newly sourced real dataset is explicitly deferred per the user's own "we'll build this out completely later."
11. **Navigation chrome.** Added a `‹ BACK` button (top-left, `RETURN_ONE_LEVEL`) alongside the existing Home/logo button; made the orbit/pan/zoom nav hint persistent instead of hiding after first hover; right-aligned the query bar and its suggestion chips.

**Regressions caught and fixed during this round's own validation** (not user-reported, found via the project's own typecheck/lint/test/e2e gate before commit):
- A shader precision mismatch: the newly-added `uTime` uniform was implicitly `highp` in the point vertex shader (no explicit precision pragma) but the fragment shader declares `precision mediump float;` — a real WebGL program validation error (visible in the e2e console-cleanliness test) that would silently break point rendering on stricter drivers. Fixed by declaring `uniform highp float uTime;` explicitly in the fragment shader to match.
- The WorldCanvas rewrite dropped the query-bar label-exclusion-zone logic in `projectLabels()` that a prior round had added (`DESIGN_DELTA.md` item 4) — without it, a territory label could again land under the (now right-aligned) query bar/suggestion-chip row and silently eat the click. Re-added, recomputed for the query bar's new right-anchored position. Caught by the e2e territory-entry test, root-caused via a direct Playwright script (`inputValue()` before/after the click showed a suggestion chip's query text appearing from a bare label click).

**Validation:** `npm run typecheck`, `npm run lint`, `npm test` (26/26), `npm run build` all pass. `npm run test:e2e` — **7/7 pass** on a clean run. Manual scripted Playwright verification (screenshots) of selection glow/pulse/petri-dish in both themes, in-place query highlighting, territory entry with legible labels and a working `‹ BACK`, the identity panel's close-button return-one-level behavior, and the Depth Rail hover state.

## Exact next task

Re-confirm the territory-label glass-backing substitution (`DESIGN_DELTA.md` item 9) against the user's literal "dynamic black/white text" request. Then, if pursued further: source a real RFdiffusion backbone trajectory and/or real AlphaFold2/ESMFold predictions for the two ProteinMPNN 6EHB candidate sequences (with verified residue-numbering correspondence) to fully animate the Design trajectory panel per `DESIGN_DELTA.md` item 11. Longer-standing deferred items (secondary-structure coloring in the sequence tray, general territory-vs-territory label collision, automated visual-regression tests, a credentialed Ask Atlas smoke test) remain open from prior rounds.
