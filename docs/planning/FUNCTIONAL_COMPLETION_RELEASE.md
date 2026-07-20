# Functional Completion

PR #6 closes the functional-engine milestone for Helicase Atlas. It preserves the merged protein universe and adds dependable navigation, complete reviewed-corpus addressability, verified structure confidence, attributable design evidence, streamed typed copilot control, structure metadata and residue focus, runtime validation, recovery, accessibility, and deployment hardening.

## Architecture

- The 75,000-protein GPU field remains the immediate browser profile; all 575,503 reviewed UniProt records remain query-addressable and can be materialized into the active scene.
- Durable mutations cross the runtime-validated `SceneCommand` boundary. Direct interaction and GPT tools share the same reducer path.
- Three.js and Mol* remain isolated behind world/structure adapters. Scientific metadata, confidence, design evidence, and camera state do not depend on the current visual shell.
- The official OpenAI Responses API streams bounded tool calls when credentialed; an explicit local mode preserves testability without impersonating GPT.

## Scientific completion

- AlphaFold X-Ray uses verified residue-keyed pLDDT and is unavailable for experimental PDB structures.
- RCSB and SIFTS metadata preserve chain, UniProt alignment, and residue-coverage caveats.
- The design journey is the existing official ProteinMPNN 6EHB example for reviewed UniProt A5F934. It is labelled precomputed and stops before unsupported structure, affinity, interface, or wet-lab claims.
- Spatial proximity continues to mean deterministic UniProt annotation-family hierarchy, never sequence or structural distance.

## Product-engine completion

- Damped orbit, truck, pointer dolly, semantic speeds, history, home/reset, interruption, keyboard input, reduced motion, and structure-return context are implemented.
- Manifest, shard, corpus, worker, command, copilot-stream, confidence, structure-metadata, and design payloads are runtime validated.
- Query, copilot, structure, and shell failures are isolated and recoverable.
- Deployment environment, secret boundary, security headers, accessibility expectations, and production QA are documented.

## Validation

- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit`
- Production browser journey at 1440 x 900 with a clean console

## Evidence-backed blockers

- Credentialed GPT-5.6 smoke testing requires an external `OPENAI_API_KEY` and model entitlement.
- Learned/hybrid embeddings and scored structural-neighbour navigation require separately versioned scientific artifacts and compute not present in the repository.
- PAE needs a dedicated pairwise-confidence interaction and must not be conflated with pLDDT.
- Release-keyed IndexedDB persistence depends on final deployment quota/offline policy.
- Chain isolation requires verified auth/label asym-ID behavior across experimental and predicted models.
- Total scene-store consolidation is deferred to the final presentation integration to avoid rewriting the temporary shell twice; the canonical replacement contract is frozen in `docs/design/UI_INTEGRATION_CONTRACT.md`.

## Review

Review scientific boundaries and engine contracts first. The parallel Claude design track may replace presentation components, but it must preserve the UI integration contract, provenance, command validation, camera semantics, and renderer isolation.
