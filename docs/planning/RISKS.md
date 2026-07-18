# Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope expands into a platform | Demo loses coherence | Protect the single continuous experience and build order in [BUILD_PLAN.md](BUILD_PLAN.md). |
| GPT makes unsupported claims | Scientific and reputational damage | Compact grounded context, schema tools, citations, and explicit uncertainty language. |
| External APIs are slow or unavailable | Broken cold start | Cache, curated fixtures, labelled fallbacks, and deterministic tours. |
| Design playback is mistaken for live generation | Loss of trust | Show pipeline provenance and `predicted_not_validated` status. |
| Three.js and Mol* compete for frame time | Poor interaction quality | Prove coexistence early, isolate render loops, and measure transitions. |
| Tool calls feel disconnected from the scene | Product feels like a wrapper | Route every action through SceneController and animate semantic effects. |
| Motion overwhelms comprehension | Beauty becomes noise | Reuse motion grammar, provide pauses, labels, and reduced-motion behavior. |
| Scientific data licensing or attribution is incomplete | Publication risk | Track source, accession, license, retrieval date, and citation per record. |
| Empty repository workflow is misunderstood | Invalid PR history | Keep bootstrap and substantive architecture commits separate and documented. |

## Risk review cadence

Revisit this file at each milestone. Add a decision record when a mitigation changes product meaning or architectural boundaries.
