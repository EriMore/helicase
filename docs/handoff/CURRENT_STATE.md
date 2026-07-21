# Current State

Last updated: 2026-07-21, by Claude (final-implementation session).

## Branch

`claude/final-implementation`, branched from `origin/integration/claude-handoff`. Draft PR #11 open against `integration/claude-handoff`.

## Latest commits (this session)

1. `91ddef3` — Design-token foundation: light/dark theme, self-hosted typography, glass-panel/scrim primitives, eslint prototype-exclusion fix, CI workflow.
2. `f63ed85` — Full spatial-hierarchy realization: SceneMode/SceneCommand rewritten to the design's 5-level hierarchy, camera engine rewritten to the exact spherical contract, WorldCanvas rewritten (territory expansion, ambient drift, bracket marker, camera choreography), every design-package component built (Header, DepthRail, QueryBar, IdentityPanel, InspectPanel, DesignPanel, SequenceTray, AskAtlas, LoadingScreen), StructureView extended (Spacefill, chain/domain color, click-to-sequence bridge), real per-protein UniProt detail fetch (`/api/atlas/protein`, `useProteinDetail`) powering Glance/Learn/Sequence with real data, relationship threads wired from real signals, sound system added, continuous 6-beat design-journey playback.

## What's implemented and verified this session

- `npm run typecheck`, `npm run lint`, `npm test` (26 tests across 4 files), `npm run build` all pass.
- Playwright smoke pass against the production build (`npm run start`): Universe renders with real 75,000-protein point field in both themes, territory entry (expansion + dim + camera reframe + rail update) verified by simulated click, theme toggle verified, zero browser console errors. One real WebGL shader bug (undeclared `color` attribute) and one text-selection regression (drag over UI chrome) were found and fixed during this pass.
- Manual code-level verification of: camera tween/easing/snapshot unit tests, SceneController reducer 5-level walk + return-one-level tests, relationship-threads scoring tests.

## Known gaps / deferred work (see `docs/handoff/DESIGN_DELTA.md` for the full detail)

1. Design journey is a continuous 6-beat timeline rather than the prototype's 9 discrete stages — intentional, per explicit task instruction for this pass.
2. Header uses one combined logo lockup, not separate icon+wordmark (no wordmark-only canonical asset exists).
3. No secondary-structure coloring in the sequence tray (no real, non-sparse data source wired yet).
4. Territory labels can visually overlap at the default arrival camera angle (cosmetic only).
5. No "sourced fact" callout in Glance (no real per-protein source for it beyond the 7 prototype fixtures).
6. Not yet done from the original roadmap: Playwright E2E test suite, screenshot-based visual regression tests, explicit reduced-motion/keyboard automated tests, multi-breakpoint (1366×768 / 1440×900 / 1920×1080 / 2560×1440) manual QA pass, `docs/handoff/FINAL_ACCEPTANCE_MATRIX.md` re-verification against the shipped build.
7. Query result centroid/reflow and territory pull-forward math in `WorldCanvas.tsx` are implemented but not unit-tested (covered only by the manual Playwright pass).
8. `OPENAI_API_KEY` credentialed Ask Atlas path (real GPT-5.6 streaming with the new 9-tool surface) has not been exercised this session — only the offline fallback path is implicitly exercised by the smoke pass.

## Exact next task

Add Playwright E2E coverage for the core navigation loop (select → glance → inspect → design → return-to-universe, query, Ask Atlas ⌘K, theme/sound toggle persistence), then re-run the full validation suite and update `docs/handoff/FINAL_ACCEPTANCE_MATRIX.md` row-by-row against the shipped build. After that, do the multi-breakpoint manual QA pass and a credentialed Ask Atlas smoke test if `OPENAI_API_KEY` is available.
