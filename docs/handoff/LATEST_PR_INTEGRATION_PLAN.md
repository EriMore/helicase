# Latest PR Integration Plan — PR #7

**Title:** Build the cinematic design trajectory reveal
**Branch:** `agent/design-trajectory-reveal` → base `main` (draft, open, unreviewed)
**Base SHA:** `1c3157c` — this is the `main` tip **immediately after PR #6** (functional-completion) and **before PR #8/#9** merged the Claude Design reference package. PR #7 was authored with no knowledge of the design target.
**Commits:** 2 (`ef90967` "Build interruptible design trajectory reveal", `da9e929` "Record design trajectory publication")
**Diff:** 13 files, +120 / −11
**Checks:** 0 configured (`get_status` → `total_count: 0`) — no CI runs against this PR; `.github/workflows/build-protein-atlas.yml` only triggers on pushes to the now-merged `agent/protein-universe` branch
**Reviews:** none

## What it adds

1. **Reducer/state additions** (`src/domain/atlas.ts`): `DesignPlayback` type (`"paused"|"playing"`), `comparedDesignCandidateIds`, new `SceneMode` value `"comparison"`, and 6 new `SceneCommand` variants — `PLAY_DESIGN_TRAJECTORY`, `PAUSE_DESIGN_TRAJECTORY`, `STEP_DESIGN_STAGE`, `SEEK_DESIGN_STAGE`, `RESTART_DESIGN_TRAJECTORY`, `COMPARE_DESIGN_CANDIDATES` — each with a correct, minimal reducer case.
2. **Runtime schema additions** (`src/domain/schemas.ts`): matching `z.object` variants for each new command, `.strict()`, correctly bounded (e.g. `SEEK_DESIGN_STAGE` stageIndex clamped `0..100`).
3. **Copilot tool** (`src/domain/copilot-tools.ts`): `design_binder(target_site: "6ehb-homotrimer", spec: string)` — an **eligibility mapper**, not a generator; it only ever resolves to the same real, imported `proteinmpnn-6ehb-example-6` artifact. Also `play_design_trajectory`, `pause_design_trajectory`, `compare_design_candidates`, `return_to_design_target` tools.
4. **UI wiring** (`src/components/AtlasExperience.tsx`): an interval-driven auto-step effect while `designPlayback==="playing"` (steps every 2400ms until the last stage, then auto-pauses — a real, working, interruptible playback loop, not a fake progress animation); new buttons (Restart/Play-Pause/Back/Step/Compare/Return) and a `<input type="range">` scrubber wired to `SEEK_DESIGN_STAGE`.
5. **CSS** (`app/globals.css`): `.design-reveal`, `.reveal-orbit` (a small spinning ring indicator while "REVEALING EVIDENCE"), `.comparison-note`, `.design-scrubber` — all inside the pre-Claude-Design dark shell's existing class vocabulary.
6. **Docs/tests**: `docs/architecture/DESIGN_TRAJECTORY_ARCHITECTURE.md` (new), `docs/AI_DEVELOPMENT_LOG.md` entry, `docs/design/UI_INTEGRATION_CONTRACT.md` + `docs/planning/PRODUCT_COMPLETION_AUDIT.md` updates, one new reducer test (`atlas.test.ts`) and two new schema-rejection tests (`schemas.test.ts`).
7. A minor defect: the `README.md` diff hunk duplicates the same added sentence twice (copy-paste artifact) — signal that this PR did not get a careful self-review pass before being opened.

## Disposition, subsystem by subsystem

| Subsystem | Disposition | Rationale |
|---|---|---|
| `src/domain/atlas.ts` reducer additions | **Cherry-pick, adapt naming** | Real, correct, minimal state machine for stage playback/scrub/compare — exactly the mechanism the design's Design Trajectory Panel needs for stage 8 (Compare) and general stage navigation. Rename `"comparison"` mode to whatever the final `SceneMode` vocabulary lands on (roadmap item 3 in the main audit) when merging. |
| `src/domain/schemas.ts` additions | **Cherry-pick unchanged** | Correctly bounded, strict, no issues found |
| `src/domain/copilot-tools.ts` `design_binder` etc. | **Cherry-pick, keep semantics, review naming against final tool list** | `design_binder` is a good eligibility-mapper pattern that matches the dossier's "reasoning → tool → visible scene change" thesis without overclaiming generation. When the final Ask Atlas tool surface is defined (`UI_INTEGRATION_HANDOFF.md` §2 lists the design-related copilot commands as `Start/leave a design journey; play, pause, restart, step and scrub stages; select/compare candidate`), reconcile tool names 1:1 against that list rather than inventing a second parallel vocabulary |
| `AtlasExperience.tsx` interval-driven auto-play effect | **Reimplement the same logic in the new component, do not import the file** | The *timing/interruption logic* (step every 2400ms, auto-pause at last stage, cleanup on unmount) is correct and worth preserving conceptually; the JSX/CSS it lives in is being fully replaced |
| `globals.css` additions | **Reject outright** | Targets the old dark-only shell's class names and token system; the new implementation uses `DESIGN_TOKENS.md` custom properties |
| `docs/architecture/DESIGN_TRAJECTORY_ARCHITECTURE.md` | **Reject as a merge, keep as a reference note** | Content is accurate and consistent with `SCIENTIFIC_DATA_BOUNDARIES.md`, but this audit's own `docs/handoff/*` documents now supersede it as the live source of truth for design-journey disposition; fold its one useful fact (the `design_binder` eligibility-mapper framing) into implementation-time commit messages instead of merging the file as-is |
| `docs/AI_DEVELOPMENT_LOG.md` entry | **Reject as a merge (would duplicate/conflict with the log's append-only history)**, re-log the cherry-picked work under its own new entry when it actually lands | `AGENTS.md` requires the log to be append-only with real session provenance — importing another branch's entry verbatim would misrepresent when the work actually merged |
| `docs/design/UI_INTEGRATION_CONTRACT.md`, `docs/planning/PRODUCT_COMPLETION_AUDIT.md` diffs | **Reject as merges** | Both docs describe the *old* shell's contract; the design-final package supersedes `UI_INTEGRATION_CONTRACT.md` and this audit's matrices supersede the relevant `PRODUCT_COMPLETION_AUDIT.md` rows |
| New tests | **Cherry-pick and extend** | The reducer test (`atlas.test.ts`) and schema-rejection tests (`schemas.test.ts`) are valid, cheap, and should move with the reducer code; add equivalent coverage for `design_binder` argument validation when that tool is wired into the final copilot tool list |

## Exact integration method recommended

1. **Do not merge PR #7.** Close it with a comment pointing to this document once the cherry-pick lands, or leave it open as a reference until then and close at that point — either is acceptable; do not let it sit indefinitely as a phantom "open PR" once its useful content has been extracted.
2. When roadmap item 11 (Design journey restyle, per `CLAUDE_TAKEOVER_AUDIT.md` §4) is implemented, hand-apply (not `git cherry-pick`, since the target file will have diverged structurally by then) the reducer/schema/tool logic from commit `ef90967` onto the new `atlas.ts`/`schemas.ts`/`copilot-tools.ts`, adapting names to the final `SceneMode`/tool vocabulary.
3. Carry over the 3 new tests, adapted to the same renamed vocabulary.
4. Do not carry over any JSX, CSS, or doc-file diffs from PR #7 — those are fully superseded by the design-final package and this audit's own handoff documents.
5. Once cherry-picked and merged through the normal review path, close PR #7 referencing the commit(s) where its logic landed.
