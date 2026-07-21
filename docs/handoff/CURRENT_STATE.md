# Current State

Last updated: 2026-07-21, by Claude (live user-testing bugfix session, following the final-implementation session).

## Branch

`claude/final-implementation`, branched from `origin/integration/claude-handoff`. Draft PR #11 open against `integration/claude-handoff`.

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

## Exact next task

Add automated reduced-motion and wider-breakpoint (2560×1440) checks to the e2e suite, then a credentialed Ask Atlas run if `OPENAI_API_KEY` becomes available. After that, a general territory-vs-territory screen-space label-collision pass for `DESIGN_DELTA.md` item 3 (the territory-vs-query-bar case is now handled).
