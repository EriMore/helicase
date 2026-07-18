# Architecture

## Architectural shape

Atlas is a browser-first scene application with a thin server boundary and explicit domain contracts.

```text
User input / GPT tool call
          |
          v
   SceneController  <---- domain state and commands
      /       \
     v         v
 StarMap     StructureView / DesignScene
      \       /
       v     v
        Copilot context
              |
              v
   Thin server: GPT + data proxies
              |
              v
 Public scientific APIs and committed fixtures
```

## SceneController

`SceneController` is the single command boundary for user input, GPT actions, guided tours, and playback. It owns intent-level transitions, validates command arguments, emits observable state changes, and delegates rendering to the active scene.

It must not contain renderer-specific code, network credentials, or model-prompt prose.

Representative commands:

- `flyToProtein(proteinId)`
- `focusResidues(residueIds)`
- `highlightDomain(domainName)`
- `setRepresentation(style)`
- `colorBy(scheme)`
- `compareTo(proteinId)`
- `designBinder(targetSite, specification)`

## Boundaries

- **Domain:** protein identity, structure context, confidence, sites, designs, tours, commands.
- **Presentation:** camera choreography, typography, lighting, transitions, panels, accessibility.
- **Rendering:** Three.js, Mol*, and design trajectory playback adapters.
- **Infrastructure:** GPT Responses API, public data proxies, caching, telemetry, and deployment.

## State model

Use explicit states for `map`, `diving`, `structure`, `xray`, `designing`, `designComplete`, and `error`. Transitions must be serializable enough to support tours and deterministic demo playback.

## Architectural invariant

The same domain command must produce the same semantic outcome whether it originated from a pointer gesture, a guided tour, or a GPT tool call.
