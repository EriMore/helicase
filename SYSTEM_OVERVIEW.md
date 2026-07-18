# System Overview

## Runtime surfaces

### Browser

- Three.js renders the protein star map and spatial effects.
- Mol* renders structures and exposes an imperative adapter for focus, highlighting, representation, and confidence display.
- React owns composition, panels, accessibility, and interaction affordances.
- `SceneController` coordinates domain commands and scene transitions.

### Thin server boundary

- `/api/copilot` assembles grounded context and calls GPT-5.6 through the Responses API.
- `/api/structure` proxies and caches public structure resources.
- `/api/design` serves curated design trajectory metadata and playback assets.

The server must never expose API keys to the browser.

### Static scientific layer

- Curated protein records and embedding coordinates.
- Structure references and confidence metadata.
- Domain, ligand, annotation, and citation records.
- Precomputed design trajectories with explicit provenance and score semantics.
- Guided tours that reference stable IDs rather than UI selectors.

## Request flow

1. User selects a protein.
2. The client loads a stable protein record and requests structure/context data.
3. The server builds a compact structured context.
4. GPT-5.6 responds with grounded text and typed scene actions.
5. The client validates and dispatches those actions through `SceneController`.
6. The renderer animates the resulting semantic transition.

## Failure philosophy

An unavailable external API should degrade to a clearly labelled curated fixture. A failed model call should leave the scene usable. A missing design asset should never be presented as a generated result.
