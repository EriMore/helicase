# Component Principles

## Components are contracts

Components should expose semantic states and intents. A `ConfidenceLegend` describes confidence; it should not know how a shader encodes it. A `DesignReveal` consumes a trajectory; it should not invent scientific scores.

## Recommended component families

- **World:** `StarMap`, `StructureView`, `DesignScene`, `Atmosphere`.
- **Orientation:** `IdentityRail`, `ScaleCue`, `TourRail`, `ReturnToMap`.
- **Interpretation:** `Copilot`, `ConfidenceLegend`, `ProvenanceNote`, `ScoreCard`.
- **Action:** `SceneCommand`, `RepresentationControl`, `CompareControl`, `DesignLaunch`.

## Rules

- Keep renderer adapters behind stable interfaces.
- Make loading, unavailable, and reduced-motion states explicit.
- Keep copy and scientific qualifiers close to the state they describe.
- Prefer composition over a universal component with dozens of modes.
- A visual component may not silently change domain state; it dispatches a command.
- A GPT tool may not bypass the same command path used by direct interaction.
