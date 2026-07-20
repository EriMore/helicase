# Product Completion Audit

Status: execution map for `agent/functional-completion`  
Authority: `AGENTS.md`, then the canonical product, architecture, engineering, design, decision, and planning documents  
Last audited: 2026-07-20

## Baseline and branch deviation

The protein-universe implementation is present on `agent/protein-universe`, but GitHub PR #5 is still an open draft and `origin/main` does not contain it. Starting from `main` would discard the milestone this pass must complete. This branch is therefore stacked on `agent/protein-universe`. It should target that branch until PR #5 merges, then be rebased or retargeted to `main`.

## Status summary

| Status | Count |
| --- | ---: |
| Complete | 22 |
| Partial | 16 |
| Missing | 10 |
| Blocked | 0 |
| **Total** | **48** |

`Complete` means the capability exists at the required engine level, not that its final Claude-designed presentation is complete. A row may move to `Blocked` only with reproducible evidence and a preserved adapter/path forward.

## Completion matrix

| # | Capability | Status | Evidence | Remaining work / dependency | Completion criteria |
| ---: | --- | --- | --- | --- | --- |
| 1 | Reviewed-UniProt ingestion | Complete | `scripts/build-atlas.mjs`; 575,503-record full build documented in the development log | Keep reproducible and provenance-preserving | Full reviewed query remains reproducible with release metadata |
| 2 | Browser delivery profile | Complete | `public/data/atlas/manifest.json`: 75,000 records, 64 shards | Do not describe as complete corpus | Progressive browser profile loads without exhausting memory |
| 3 | Stable protein identifiers and positions | Complete | Accession-keyed records and deterministic spatialization | Version reconstruction semantics | Same source record and spatial version reconstruct the same address |
| 4 | GPU point-field rendering | Complete | `WorldCanvas.tsx` buffer geometry and shader points | Preserve behind renderer adapter | 75k profile renders within budget at target viewport |
| 5 | Multiscale aggregate/protein visibility | Complete | Cluster/protein opacity transitions by camera distance | Connect to semantic zoom engine | Universe, region, cluster, protein scales remain legible |
| 6 | Local worker-backed search | Complete | `public/workers/atlas-search.js` | Add schemas, cancellation and remote fallback | Loaded records search off-main-thread with deterministic ranking |
| 7 | Experimental/predicted source distinction | Complete | `StructureReference.kind` and structure UI | Extend provenance/coverage metadata | No predicted confidence is attached to experimental structures |
| 8 | Mol* renderer isolation | Complete | Client-only `StructureView` adapter | Add an imperative engine-facing adapter contract | UI does not depend on Mol* internals |
| 9 | Universe context preservation on structure entry | Complete | `CameraContext` captured before selection | Replace single slot with stable history/navigation engine | Return restores the exact prior spatial state |
| 10 | SceneController as sole mutation boundary | Partial | Typed reducer exists, but UI local state and canvas refs bypass it | Build engine store, commands, events and async effects | Gesture, UI, GPT and playback all issue validated commands |
| 11 | Complete scene state | Partial | Mode/query/selection/camera are split across reducer and components | Consolidate loading, structure, confidence, design, copilot and errors | One serializable engine snapshot describes the product |
| 12 | Natural orbit navigation | Complete | `CameraNavigation.orbit`; left-drag in `WorldCanvas` | Preserve through final renderer integration | Pointer orbit is target-aware, damped and interruptible |
| 13 | Pan/truck navigation | Complete | Shift/secondary drag uses scale-sensitive `truck` | Preserve through final renderer integration | Mouse and trackpad pan predictably at all scales |
| 14 | Pointer-centered dolly | Complete | Wheel/trackpad ray anchor is passed to `dolly` | Preserve through final renderer integration | Zoom moves toward the location under the pointer |
| 15 | Camera damping and inertia | Complete | Time-based navigation update, velocity decay and no-motion completion | Tune only from measured QA | Direct and scripted motion settle smoothly and deterministically |
| 16 | Semantic zoom constraints | Complete | Named distance scale, 8–520 distance clamp and scale-sensitive keyboard/truck speeds | Add final UI orientation labels | Movement and LOD adapt across Atlas scales |
| 17 | Camera history/home/reset | Complete | 32-entry value snapshot history; Home, R and Backspace commands | Expose final-design controls | Home, reset and previous-camera actions are reliable |
| 18 | Programmatic focus/cancellation | Complete | Named focus transitions; direct input calls `cancel` | Connect expanded GPT tools | User input safely interrupts automated motion |
| 19 | Keyboard/reduced-motion navigation | Complete | WASD/arrows/QE/Home/R/Backspace and media-query behavior | Final accessibility copy | Keyboard access and OS motion preference work end to end |
| 20 | Full reviewed-corpus query access | Complete | `/api/atlas/search` queries live reviewed UniProtKB with release and total-result headers | Add deployment observability | Any reviewed accession/query is addressable with provenance |
| 21 | Query-driven record injection | Complete | Remote results are normalized, deterministically spatialized, inserted into GPU data and indexed in the worker | Preserve projection version | Remote hit appears in active scene and can be selected |
| 22 | Corpus paging and cancellation | Partial | Server validates cursors/size; client aborts stale remote requests | Expose next-page UI/engine command | Large queries are bounded, cancellable and progressive |
| 23 | Local cache/persistence | Missing | Shards refetch each session | CacheStorage/IndexedDB adapter with release key | Compatible data persists and invalidates by release/schema |
| 24 | Runtime data validation | Partial | Zod validates manifests, shards, corpus, confidence and design contracts | Validate worker messages and SceneController commands | Invalid records fail safely with actionable errors |
| 25 | Annotation-family spatial semantics | Complete | Manifest explicitly states deterministic family model | Keep as baseline semantic adapter | Proximity remains honest and explainable |
| 26 | Learned sequence neighbourhoods | Missing | Explicitly absent | Embedding adapter; largest defensible computed/imported slice | Learned similarity is versioned, measured and never implied globally |
| 27 | Structural-similarity navigation | Missing | Explicitly absent | RCSB structural-neighbour adapter where PDB exists | Related structures are sourced, scored and navigable |
| 28 | Explain-proximity capability | Partial | Caveat text exists | Evidence object for family/sequence/structure signals | UI/GPT can state exactly why two proteins are near |
| 29 | Hybrid spatial projection adapter | Missing | Spatialization is hard-coded in build script | Versioned projection interface and signal metadata | Alternative projections plug in without changing renderer/UI |
| 30 | AlphaFold model resolution | Complete | Official metadata API resolves model entity, latest version, confidence and PAE artifact URLs | Reuse resolved coordinate URL in Mol* adapter | Model source/version/accession are verified and recoverable |
| 31 | Per-residue pLDDT extraction | Complete | `/api/structure/confidence` validates residue-number and score arrays and preserves model provenance | Add mismatch telemetry | Verified residue scores and provenance reach engine |
| 32 | Confidence X-Ray | Partial | Predicted entries activate Mol* `QualityAssessmentPLDDTPreset` and show verified pLDDT ranges; experimental entries stay unavailable | Add residue-range focus and low-confidence fog treatment | Real low/high-confidence regions are visible and queryable |
| 33 | PAE support | Missing | None | Optional AlphaFold PAE adapter | PAE is exposed only when retrieved and mapped correctly |
| 34 | Residue focus/selection | Missing | Mol* renders whole structure only | Structure adapter commands and residue mapping | Users/GPT can select and frame source-numbered residues |
| 35 | Representation/chain/ligand controls | Partial | Cartoon and ligand defaults exist | Engine-level options, chain visibility and safe defaults | Controls operate without exposing Mol* details |
| 36 | PDB residue coverage mapping | Missing | UI warns coverage unresolved | Map UniProt/PDB chains/ranges with caveats | Experimental coverage is explicit and residue actions are guarded |
| 37 | Structure errors/retry/cancellation | Partial | Unavailable state and teardown exist | Abort requests, retry command, structured failure causes | Repeated entry/exit is leak-free and failures recover |
| 38 | Provenance design-trajectory schema | Missing | Only `developmentDesign` disclaimer fixture | Versioned stage/candidate/metric/provenance contracts | Every design artifact has source, method, identity and limitations |
| 39 | Scientifically honest design journey | Missing | Percentage choreography only | Import verified public/generated workflow or record blocker evidence | Eligible target can traverse real precomputed stages/candidates |
| 40 | Design navigation/comparison | Missing | No stage/candidate controls | Back/forward/select/compare/return commands | Journey is inspectable and reversible through SceneController |
| 41 | Responses API integration | Partial | Credentialed POST exists | Official streaming path, abort, schemas and model config | Credentialed run streams concise provenance-aware output |
| 42 | Bounded validated GPT tools | Partial | Six strict JSON schemas but unvalidated execution | Runtime discriminated schemas and result/error protocol | Invalid calls cannot mutate scene; tools return structured outcomes |
| 43 | Complete GPT scene context | Partial | Basic scene and selected protein only | Query, camera, structure, confidence and design context | Copilot reasons from the same engine snapshot as UI |
| 44 | Copilot interruption/offline behavior | Partial | Labelled local fallback exists | Abort, retry, status events and no false credential claims | User can cancel/recover; offline mode stays explicit |
| 45 | Error/loading/recovery state machine | Partial | Ad hoc local strings and loader | Engine-level typed async states and retry actions | Every critical async subsystem exposes progress/error/recovery |
| 46 | Automated tests | Partial | Vitest covers camera semantics/history/limits and scientific schemas | Add API, SceneController, design and E2E coverage | Critical reducers, schemas, camera, APIs and journey are covered |
| 47 | Accessibility and input robustness | Partial | Labels and CSS reduced motion exist | Focus order, live status, keyboard, contrast, sound defaults | Keyboard and reduced-motion journey passes manual QA |
| 48 | Production/deployment hardening | Partial | Typecheck/lint/build scripts and clean foundation build | Env validation, security headers, budgets, dependency audit, E2E | Documented setup; checks/build/E2E/manual journey pass |

## Dependency-ordered execution

1. Freeze the UI integration contract; introduce runtime schemas and an engine-owned SceneController state/effect boundary.
2. Extract a reusable camera/navigation engine, its renderer adapter, snapshots, deterministic transitions and accessibility controls.
3. Add full-corpus server querying, query-driven record injection, cancellation, release-aware caching and worker recovery.
4. Introduce versioned spatial-semantic adapters; add real structural-neighbour evidence and the largest defensible learned/hybrid layer.
5. Add verified AlphaFold metadata, pLDDT/optional PAE extraction, residue mapping and Confidence X-Ray.
6. Complete the isolated structure adapter: focus/select residues, representation, chains, ligands, coverage, cancellation and retry.
7. Replace design choreography with a provenance-carrying precomputed journey and reversible candidate/stage controls.
8. Upgrade the copilot to official Responses API streaming with runtime-validated tools and complete scene context.
9. Add failure recovery, resource budgets, accessibility, tests, environment/deployment documentation and dependency remediation.
10. Run and record the complete three-minute journey at the target viewport; keep this matrix and the AI log current.

## Hard external dependencies to test early

- Availability, limits and response stability of UniProt, RCSB and AlphaFold public services.
- Availability of a scientifically attributable RFdiffusion to ProteinMPNN to structure-validation example, or compute capable of producing one. A visual reconstruction is not accepted as a trajectory.
- A valid `OPENAI_API_KEY` with access to the configured model for credentialed end-to-end QA.

## Definition of completion

The pass is complete only when every row is `Complete` or `Blocked` with reproducible evidence, the current visual shell can be replaced without rewriting the engine, all scientific claims carry provenance and limitations, the complete journey passes automated and manual validation, and the branch is pushed with a draft PR.
