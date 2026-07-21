# Product Completion Audit

Status: execution map for `agent/functional-completion`  
Authority: `AGENTS.md`, then the canonical product, architecture, engineering, design, decision, and planning documents  
Last audited: 2026-07-20

## Baseline

The merged protein-universe milestone is the base of `agent/functional-completion`. This audit records the functional engine delivered by PR #6; the parallel visual-design track remains intentionally separate.

## Status summary

| Status | Count |
| --- | ---: |
| Complete | 39 |
| Partial | 0 |
| Missing | 0 |
| Blocked | 9 |
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
| 10 | SceneController as sole mutation boundary | Blocked | Every durable scene mutation and GPT tool crosses `sceneCommandSchema` and `reduceScene`; transient query/copilot/loading state remains in React hooks | A total external engine-store migration would rewrite the current presenter while the replacement visual shell is being designed | Resume against `UI_INTEGRATION_CONTRACT.md` when the final presenter exists; renderer/scientific adapters are already isolated |
| 11 | Complete scene state | Blocked | `SceneState` is serializable for durable scene state; request lifecycles and messages remain hook-owned | Consolidation requires the same deferred presenter/store migration as row 10 | Canonical snapshot contract is frozen; implementation migration occurs with the final shell, not through a disposable intermediate store |
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
| 22 | Corpus paging and cancellation | Complete | Server validates cursor/size, reports `nextCursor`, and client aborts stale local/remote requests | Final shell may expose explicit next-page affordance | Queries are bounded, cancellable and progressively addressable through the API contract |
| 23 | Local cache/persistence | Blocked | Immutable static shards use browser HTTP caching; no release-keyed IndexedDB store exists | A safe persistent store needs quota, migration and invalidation work tied to the final deployment origin | Add only after deployment storage budgets and the final shell's offline policy are known |
| 24 | Runtime data validation | Complete | Zod validates commands, worker messages, copilot stream events, manifests, shards, corpus, confidence, structure metadata and design artifacts | Keep schemas versioned | Invalid records/events fail before state mutation with recoverable errors |
| 25 | Annotation-family spatial semantics | Complete | Manifest explicitly states deterministic family model | Keep as baseline semantic adapter | Proximity remains honest and explainable |
| 26 | Learned sequence neighbourhoods | Blocked | No versioned full-corpus embedding artifact or model runtime is present; the current 575,503-record source build contains annotations, not sequences/embeddings | Producing a defensible projection requires external model compute and a separately versioned corpus artifact | Import/build a measured embedding release; never relabel annotation-family distance as learned similarity |
| 27 | Structural-similarity navigation | Blocked | Only 39,017 reviewed records have PDB links and no complete scored structure-neighbour artifact is available in-repo | Coverage-limited RCSB similarity requires a separately sourced/versioned adapter and network QA | Add scored structural evidence where available without implying corpus-wide coverage |
| 28 | Explain-proximity capability | Complete | UI and GPT context explicitly identify deterministic UniProt annotation-family hierarchy and reject structural/sequence-distance claims | Extend evidence when new projections ship | Current proximity is explainable without fabricated meaning |
| 29 | Hybrid spatial projection adapter | Blocked | Renderer contracts accept stable positions, but no measured learned/structural signal artifact exists to combine with annotation families | Depends on rows 26 and 27 | Publish a versioned projection artifact and decision record before changing spatial semantics |
| 30 | AlphaFold model resolution | Complete | Official metadata API resolves model entity, latest version, confidence and PAE artifact URLs | Reuse resolved coordinate URL in Mol* adapter | Model source/version/accession are verified and recoverable |
| 31 | Per-residue pLDDT extraction | Complete | `/api/structure/confidence` validates residue-number and score arrays and preserves model provenance | Add mismatch telemetry | Verified residue scores and provenance reach engine |
| 32 | Confidence X-Ray | Complete | Verified AlphaFold pLDDT drives Mol* colouring; real confidence ranges are queryable/focusable; experimental entries remain unavailable | Final visual shell may reinterpret the presentation | Correct residue ranges, model version, source and limitations are visible |
| 33 | PAE support | Blocked | Verified AlphaFold metadata preserves the official PAE URL, but no pairwise matrix renderer is implemented | PAE needs a dedicated residue-pair interaction and is not required for local-confidence X-Ray | Retrieve/map only with a dedicated scientifically legible view; do not conflate with pLDDT |
| 34 | Residue focus/selection | Complete | `FOCUS_RESIDUES` is runtime validated and Mol* frames author-numbered ranges; verified pLDDT ranges issue the same command | Final UI may add free-form range entry | Users/GPT can focus source-numbered residue ranges without clipping the whole structure |
| 35 | Representation/chain/ligand controls | Blocked | SceneController owns cartoon/surface/ball-and-stick and ligand visibility; RCSB/SIFTS exposes chain identities and chain-scoped residue focus | Reliable chain isolation still needs model-specific auth/label asym-ID validation across experimental and predicted sources | Do not expose a chain toggle until cross-source selections are verified; existing controls remain renderer-agnostic |
| 36 | PDB residue coverage mapping | Complete | RCSB entry/polymer metadata plus SIFTS mappings expose entity/reference starts, aligned length and UniProt coverage | Preserve warnings when mappings are unavailable | Experimental coverage and author-number caveats are explicit |
| 37 | Structure errors/retry/cancellation | Complete | Renderer reports loading/ready/unavailable, accepts monotonic retry, disposes on exit/replacement and exposes recoverable retry UI | Browser fetch cancellation remains governed by Mol* lifecycle | Repeated entry/exit is clean and failed loads can be retried |
| 38 | Provenance design-trajectory schema | Complete | `designTrajectorySchema` validates stage, candidate, metric and provenance payloads; shipped fixture passes runtime tests | Preserve versioned evidence boundary | Every design artifact has source, method, identity and limitations |
| 39 | Scientifically honest design journey | Complete | Official ProteinMPNN example 6 for reviewed UniProt A5F934 / PDB 6EHB; exact model hash, seed, temperature, candidates and limitations imported | A future validated trajectory may append prediction/interface stages | Eligible target traverses real precomputed stages and stops honestly at unavailable validation |
| 40 | Design navigation/comparison | Complete | `START_DESIGN_JOURNEY`, `SET_DESIGN_STAGE`, `SELECT_DESIGN_CANDIDATE`, reversible UI controls and source return | Final shell may replace presentation | Journey is inspectable and reversible through SceneController commands |
| 41 | Responses API integration | Blocked | Official Responses API streaming, cancellation, strict tools and explicit local fallback are implemented | No `OPENAI_API_KEY` was present in the closeout environment, so a credentialed production request could not be executed | Supply a valid key/model entitlement and run the documented credentialed smoke test |
| 42 | Bounded validated GPT tools | Complete | Strict OpenAI schemas plus Zod runtime validation; tests reject extra/out-of-range arguments before dispatch | Keep tool set bounded as engine grows | Invalid calls cannot mutate scene; accepted calls cross the typed command boundary |
| 43 | Complete GPT scene context | Complete | Request includes mode, query, indexed count, stable camera snapshot, representation, ligands, residue focus, selected protein, confidence and design state | Expand additively with future projection evidence | Copilot reasons from the same durable scientific/scene context shown by the UI |
| 44 | Copilot interruption/offline behavior | Complete | New turns abort stale streams; explicit Cancel control; local mode uses identical validated NDJSON events/tools | Credentialed QA remains row 41 | User can cancel/recover and offline behavior is clearly identified |
| 45 | Error/loading/recovery state machine | Complete | Atlas, query, worker, structure, confidence, design and copilot expose isolated status/error/retry paths; uncaught shell failures use `app/error.tsx` | Final store consolidation is row 10/11 | A subsystem failure does not collapse unrelated navigation |
| 46 | Automated tests | Complete | Vitest covers camera/reducer semantics, scientific contracts, command rejection, worker events, copilot events and shipped design evidence | Browser automation may be added after final shell stabilizes | Critical engine/schema paths pass in CI-compatible commands |
| 47 | Accessibility and input robustness | Complete | Focusable application surface, labelled controls, keyboard navigation/help, focus-visible treatment, semantic alerts and reduced-motion policy | Final design must preserve the contract | Keyboard/reduced-motion behavior passes manual production QA |
| 48 | Production/deployment hardening | Complete | Env template, secret boundary, security headers, error boundary, deployment runbook, cancellation/disposal, validation scripts and production browser QA | Credentialed GPT smoke remains row 41 | Documented setup and all local validation/manual journeys pass |

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

## Evidence-backed blockers retained after closeout

- Full-corpus learned/hybrid embeddings require a versioned sequence artifact and external model compute not present in this repository (rows 26 and 29).
- Structural-neighbour navigation requires a separately sourced and scored coverage-limited artifact; existing PDB links are provenance, not similarity scores (row 27).
- Release-keyed IndexedDB persistence depends on final deployment quota and offline-policy decisions (row 23).
- PAE needs a dedicated pairwise confidence interaction and must not be folded into local pLDDT X-Ray (row 33).
- Chain isolation needs verified auth/label asym-ID selection across experimental and predicted structures; current metadata/focus support is preserved without an unsafe visibility toggle (row 35).
- Credentialed GPT-5.6 QA requires a valid external `OPENAI_API_KEY` and model entitlement (row 41).
- Total scene-store migration is intentionally blocked on the final presentation implementation so the temporary shell is not rewritten twice (rows 10 and 11).

## Design trajectory reveal update — 2026-07-20

The headline reveal now has a deterministic player: validated `design_binder` mapping, play/pause/restart, stage stepping, scrubbing, candidate comparison, safe return, and an explicit evidence boundary. RFdiffusion, candidate folding, docking, confidence and wet-lab validation are unavailable in the public run and are not simulated.

## Definition of completion

The closeout is publishable when every row is `Complete` or evidence-backed `Blocked`, all local validations and the manual production journey pass, PR #6 reflects this matrix, and the branch is pushed without merging.
