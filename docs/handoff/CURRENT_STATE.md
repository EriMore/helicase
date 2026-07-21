# Current State

Last updated: 2026-07-21, by Claude (takeover audit session).

## Branch

`claude/takeover-audit`, branched from `origin/integration/claude-handoff` (SHA `dc971af`). `main` (`a748204`) is one no-op-for-this-purpose commit ahead (adds `CLAUDE.md` only) and was not used as the base so this PR's diff stays limited to the new handoff documents.

## Latest commit (this session)

Documentation-only: added `docs/handoff/CLAUDE_TAKEOVER_AUDIT.md`, `docs/handoff/IMPLEMENTATION_GAP_MATRIX.md`, `docs/handoff/FINAL_ACCEPTANCE_MATRIX.md`, `docs/handoff/LATEST_PR_INTEGRATION_PLAN.md`, `docs/handoff/CURRENT_STATE.md` (this file). No application code was modified.

## Completed work (this session)

- Established ground truth: `git status`/`remote -v`/all local+remote branches+tag/full commit graph; enumerated all 9 GitHub PRs; read PR #7 (the only open PR) in full — description, both commits, full 13-file diff, check status (none configured), reviews (none).
- Read `AGENTS.md`, `CLAUDE.md`, `README.md`, and every file `CLAUDE.md` imports, plus the complete `docs/design/final/` package (10 markdown files + manifest), `docs/planning/PRODUCT_COMPLETION_AUDIT.md`, `docs/engineering/DEPLOYMENT.md`, `docs/AI_DEVELOPMENT_LOG.md` (full history).
- Read every file in `src/` (domain, engine, components, hooks), every `app/` route and shell file, `public/workers/atlas-search.js`, `public/data/design/proteinmpnn-6ehb.json`, `.github/workflows/build-protein-atlas.yml`.
- Installed dependencies (`npm ci`, not previously present in this container) and ran `typecheck`, `test`, `lint`, `build` against the current tree to establish real (not log-reported) current build behaviour.
- Produced the five handoff documents listed above.

## Validation performed

- `npm ci` — clean, 0 vulnerabilities.
- `npm run typecheck` — **pass**.
- `npm test` — **pass**, 15/15 across 3 files.
- `npm run build` — **pass** (`next build --webpack`, Next.js 16.2.10).
- `npm run lint` — **fail**, 2 errors, both inside `prototypes/claude-design-final/support.js` (unmodified vendor DC-runtime reference file being incorrectly linted because `eslint.config.mjs` doesn't exclude `prototypes/**`). This is a pre-existing repository defect discovered during this audit, not introduced by it. No application code was touched to fix it, per this session's scope (documentation only) — flagged as the first fix in the implementation roadmap.
- No browser QA was performed this session (audit was documentation-only, no UI changes to verify).

## Known failures / open defects (pre-existing, not introduced this session)

1. `npm run lint` fails on `prototypes/claude-design-final/support.js` (see above). Fix: add `"prototypes/**"` to `globalIgnores` in `eslint.config.mjs`.
2. No CI workflow gates pull requests against `main` or `integration/claude-handoff`. `.github/workflows/build-protein-atlas.yml` is scoped only to `push`/`workflow_dispatch` on the merged `agent/protein-universe` branch.
3. PR #7 (open, draft) contains real, useful reducer/tool logic (design-trajectory playback/scrub/compare) but is built entirely against the pre-Claude-Design UI shell and predates the design-final package merging into `main`. See `LATEST_PR_INTEGRATION_PLAN.md`.
4. The production UI (`AtlasExperience.tsx`, `WorldCanvas.tsx`, `globals.css`) is, presentation-wise, still the pre-Claude-Design "Codex-era" interface: single dark theme, permanent bottom-right copilot panel, no Depth Rail, no Glance/Learn, no sequence tray, no relationship threads, no sound. The underlying engine (SceneController, camera, Mol* adapter, search, data pipeline, copilot streaming) is real and largely sound — see `CLAUDE_TAKEOVER_AUDIT.md` for the full breakdown of what to keep vs. rebuild.

## Exact next task

Start implementation at roadmap item 1 in `CLAUDE_TAKEOVER_AUDIT.md` §4: land the `DESIGN_TOKENS.md` token set as real CSS custom properties (light + dark), self-host Spectral + IBM Plex Mono, and add a theme toggle with `localStorage` persistence. Fix the `eslint.config.mjs` `prototypes/**` exclusion in the same first commit. Do not begin the Depth Rail, Glance/Learn, or any other visual component before the token/typography foundation lands — every subsequent component depends on it.
