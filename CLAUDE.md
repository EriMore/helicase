# Helicase Atlas — Claude Code Project Memory

Read and obey:

@AGENTS.md

Read before material implementation decisions:

@README.md
@docs/product/Helicase_Atlas_BuildWeek_Dossier.md
@docs/design/final/DESIGN_TARGET.md
@docs/design/final/UI_INTEGRATION_HANDOFF.md
@docs/design/final/VISUAL_ACCEPTANCE_CRITERIA.md
@docs/design/final/SCIENTIFIC_DATA_BOUNDARIES.md
@docs/AI_DEVELOPMENT_LOG.md

Read when it exists:

@docs/handoff/CURRENT_STATE.md
@docs/handoff/CLAUDE_TAKEOVER_AUDIT.md
@docs/handoff/IMPLEMENTATION_GAP_MATRIX.md
@docs/handoff/FINAL_ACCEPTANCE_MATRIX.md

## Authority and precedence

1. AGENTS.md governs the overall product vision, scientific integrity, engineering philosophy and repository behaviour.
2. The exported Claude Design prototype under `prototypes/claude-design-final/` is the authoritative visual and interaction target.
3. `docs/design/final/` is the authoritative design handoff.
4. The existing production code, data pipeline and latest sound implementation work are authoritative for scientific data, provenance, performance and engine behaviour.
5. The Claude Design must not be diluted merely because the existing implementation uses a different UI.
6. The production engine must not be replaced by design fixtures or schematic geometry.

When implementation and design differ:

- preserve the Claude Design’s composition, hierarchy, typography, motion and interaction;
- preserve the repository’s real data, Mol*, search, SceneController, scientific qualification and performance;
- adapt the real engine to the design;
- do not compromise toward the old interface by default.

## Repository facts

- Complete reviewed-protein index: 575,503 records.
- Current browser delivery profile: 75,000 proteins.
- Protein data must remain real and provenance carrying.
- Experimental and predicted structures must remain visibly distinct.
- Relationships must come from explicit annotations or computed similarity, not LLM invention.
- GPT may query, navigate and explain the graph but must not fabricate graph edges.
- Mol* is the authoritative structure renderer.
- Prototype molecular geometry is illustrative only.
- Protein-design playback must identify whether it is live, streamed or precomputed.
- No scientific metric may be fabricated.
- Unknowns remain unknown.

## Final design target

The final application must unmistakably match the exported Claude Design in:

- light and dark modes;
- global navigation;
- loading experience;
- universe composition;
- depth navigation;
- query surface;
- Ask Atlas;
- territory transitions;
- protein Glance and Learn;
- relationship threads;
- sequence tray;
- structure controls;
- protein-design trajectory;
- typography;
- optical panel treatment;
- motion;
- restraint.

The final application must not revert to:

- the former Codex interface;
- a generic dashboard;
- a permanent chatbot sidebar;
- neon-heavy AI styling;
- generic SaaS cards;
- uncontrolled text over moving scene content;
- schematic protein geometry in production.

## Required working practice

Before editing:

1. Confirm the working directory.
2. Confirm the current branch.
3. Inspect `git status`.
4. Fetch the latest remote state.
5. Inspect relevant open PRs.
6. Read `docs/handoff/CURRENT_STATE.md`.

During work:

- use logical commits;
- push regularly;
- maintain `docs/AI_DEVELOPMENT_LOG.md`;
- update `docs/handoff/CURRENT_STATE.md`;
- run typecheck, lint, tests and production build;
- perform browser QA;
- keep responses concise;
- implement rather than narrate;
- do not stop for approval unless genuinely blocked;
- never work outside this repository.

At the end of every work session, record:

- branch;
- latest commit;
- completed work;
- validation performed;
- known failures;
- exact next task.
