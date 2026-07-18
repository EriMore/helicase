# Technology Stack

## Default direction

- Next.js and React for the browser application and thin server routes.
- TypeScript with strict mode for domain contracts and tool validation.
- Three.js for the star map, camera choreography, particles, and spatial effects.
- Mol* for molecular structure rendering rather than a custom molecular renderer.
- GPT-5.6 Responses API for grounded reasoning, streaming, and typed tool calls.
- JSON or a similarly transparent fixture format for the first curated scientific dataset.

## Selection criteria

Choose libraries that improve interaction quality, scientific correctness, or maintainability. Avoid dependencies that create an opaque runtime, a second state system, or a large visual language unrelated to the product.

## Dependency policy

Every runtime dependency needs a clear responsibility and an exit path. Pin versions during the demo build, document licenses, and keep provider-specific code behind adapters.

## Non-goals

No authentication provider, workflow engine, enterprise database, collaboration system, or live GPU orchestration is required for the founding slice.
