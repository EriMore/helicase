# Decisions

## D-001: Atlas is the first slice

The initial product is a single continuous protein-universe experience, not the full Helicase platform. This keeps the public thesis legible while preserving the core architecture.

## D-002: SceneController is the command boundary

User gestures, GPT actions, guided tours, and design playback use one semantic command path. This prevents the copilot from becoming a decorative chat layer.

## D-003: Mol* owns molecular rendering

Molecular rendering is a specialized problem. Mol* provides a credible foundation; Helicase owns the surrounding interaction, composition, and adapter contract.

## D-004: Curated fixtures are allowed; false claims are not

The first map and design set may be curated for clarity and reliability. Source, provenance, prediction status, and selection method must remain visible.

## D-005: Live generation is a future adapter

The domain contract should support a generation job, but the first public slice uses precomputed trajectories. The playback must look and behave like a real pipeline without implying live compute.

## D-006: No platform infrastructure before the experience

Authentication, collaboration, project graphs, accounts, and generalized job orchestration are deferred until the single-user instrument proves its value.

## D-007: Semantic CSS tokens are the first presentation layer

The initial single-screen experience uses a small, explicit CSS token layer rather than introducing utility markup across the scene composition. This keeps the visual language adjacent to its motion and spatial rules while the application is renderer-heavy. Tailwind remains a viable future implementation detail, but it does not create user-visible capability at this stage.
