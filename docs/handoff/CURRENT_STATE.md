# Current State

Last updated: 2026-07-21, by Claude (final-implementation session).

## Branch

`claude/final-implementation`, branched from `origin/integration/claude-handoff`. Draft PR #11 open against `integration/claude-handoff`.

## Latest commits (this session)

1. `91ddef3` — Design-token foundation: light/dark theme, self-hosted typography, glass-panel/scrim primitives, eslint prototype-exclusion fix, CI workflow.
2. `f63ed85` — Full spatial-hierarchy realization: SceneMode/SceneCommand rewritten to the design's 5-level hierarchy, camera engine rewritten to the exact spherical contract, WorldCanvas rewritten (territory expansion, ambient drift, bracket marker, camera choreography), every design-package component built (Header, DepthRail, QueryBar, IdentityPanel, InspectPanel, DesignPanel, SequenceTray, AskAtlas, LoadingScreen), StructureView extended (Spacefill, chain/domain color, click-to-sequence bridge), real per-protein UniProt detail fetch (`/api/atlas/protein`, `useProteinDetail`) powering Glance/Learn/Sequence with real data, relationship threads wired from real signals, sound system added, continuous 6-beat design-journey playback.
3. `4ea6ff6` — Development log, current-state, and design-delta doc updates.
4. `e30b235` — Playwright E2E suite + a real bug fix it caught: `AskAtlas`'s `visible` prop was `!loaderVisible && !commandOpen`, which unmounted the whole component (including the command panel itself) the instant ⌘K opened it. Fixed so the component stays mounted once loading completes and only the summon button hides while the panel is open. Also added `vitest.config.ts` (excludes `e2e/**` from Vitest's default glob) and removed two small dead-code/CSS leftovers.

## What's implemented and verified this session

- `npm run typecheck`, `npm run lint`, `npm test` (26 tests across 4 files), `npm run build` all pass.
- **`npm run test:e2e` — 7/7 Playwright end-to-end tests pass** against the production build (`e2e/atlas.spec.ts`): loading→Universe arrival, zero browser console errors, theme persistence across reload, territory entry (rail update + return hint), deterministic query (distinct from Ask Atlas), Ask Atlas ⌘K/Ctrl+K summon+dismiss (never a persistent sidebar), sound-preference persistence across reload.
- Manual visual-fidelity comparison against `docs/design/final/screenshots/*.png` (Universe/Territory, Glance light+dark, Learn, Inspect with Spacefill+sequence tray): structural and typographic match confirmed component-by-component.
- Two real bugs found and fixed via automated testing this session: a WebGL vertex-shader bug (undeclared `color` attribute), and the Ask Atlas visibility bug above.
- Unit tests: camera tween/easing/snapshot-restore (6 tests), SceneController 5-level-hierarchy walk + return-one-level + design-progress-clamp (7 tests), relationship-threads scoring (3 tests), runtime schema rejection (8 tests).

## Known gaps / deferred work (see `docs/handoff/DESIGN_DELTA.md` for the full detail)

1. Design journey is a continuous 6-beat timeline rather than the prototype's 9 discrete stages — intentional, per explicit task instruction for this pass.
2. Header uses one combined logo lockup, not separate icon+wordmark (no wordmark-only canonical asset exists).
3. No secondary-structure coloring in the sequence tray (no real, non-sparse data source wired yet).
4. Territory labels can visually overlap at the default arrival camera angle (cosmetic only).
5. No "sourced fact" callout in Glance (no real per-protein source for it beyond the 7 prototype fixtures).
6. Not yet done: screenshot-based automated visual-regression tests (manual screenshot comparison was performed instead this session), an automated reduced-motion test, multi-breakpoint (1366×768 / 1920×1080 / 2560×1440 — 1440×900 was covered) automated QA, a credentialed Ask Atlas smoke test (no `OPENAI_API_KEY` was available this session — only the offline fallback path is exercised by e2e/manual testing).
7. Query result centroid/reflow and territory pull-forward math in `WorldCanvas.tsx` are covered by e2e (query test) but not unit-tested in isolation.
8. Mol* representation/color-mode switching still re-runs the full plugin `initialize()` rather than a lighter update path (pre-existing, unchanged this session).

## Exact next task

Add automated reduced-motion and 1920×1080/2560×1440 breakpoint checks to the e2e suite (or a manual pass if automation proves awkward for the WebGL canvas), then attempt a credentialed Ask Atlas run if `OPENAI_API_KEY` becomes available. After that, revisit `docs/handoff/DESIGN_DELTA.md` item 4 (territory label overlap) with either a screen-space de-overlap pass or a re-tuned default camera angle.
