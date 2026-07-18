# Contributing

## Before changing code or content

Read [PRINCIPLES.md](PRINCIPLES.md), [ENGINEERING_PRINCIPLES.md](ENGINEERING_PRINCIPLES.md), [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md), and the relevant architecture document.

## Change expectations

- Explain the user-visible capability or integrity improvement.
- Preserve the SceneController boundary.
- Keep scientific claims traceable to data or clearly labelled as hypotheses.
- Add tests for domain behavior and deterministic fixtures.
- Validate motion and accessibility when changing interaction behavior.
- Update [DECISIONS.md](DECISIONS.md) when a change alters a core contract.

## Pull requests

PRs should state the problem, the intended experience, architectural impact, data/provenance implications, verification performed, and deliberate non-goals. Screenshots or recordings are expected for meaningful visual changes.

## AI-assisted work

AI-generated changes remain the author’s responsibility. Review every file, run the relevant checks, remove speculative complexity, and preserve the honesty rules in [API_STRATEGY.md](API_STRATEGY.md).

## Documentation-only foundation

The founding architecture PR intentionally contains no application implementation. Implementation begins after this foundation is reviewed.
