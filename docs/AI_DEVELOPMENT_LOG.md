---

## 2026-07-20T00:00:00+01:00 - Design trajectory reveal

**Phase:** Implementation

**Objective**  
Turn the attributable 6EHB ProteinMPNN artifact into an interruptible cinematic evidence reveal without fabricating unavailable biological stages.

**Completed**
- Added typed playback state and commands for play, pause, restart, step, seek, comparison and safe return through SceneController.
- Added strict `design_binder` mapping for the eligible A5F934 / 6EHB target; it never generates a sequence.
- Added a stage reveal HUD, scrubber, candidate comparison state and explicit imported-artifact language.
- Preserved the evidence boundary for unavailable RFdiffusion frames, predicted structures, docking/interface metrics, confidence and wet-lab validation.

**Git**
- Branch: `agent/design-trajectory-reveal`.
- Commit(s): `ef90967` (`Build interruptible design trajectory reveal`).
- PR: Draft [#7](https://github.com/EriMore/helicase/pull/7).
- Status: Pushed and validated.

**Next**
Run the full validation suite and production browser QA at 1440x900.

## 2026-07-20T05:40:00+01:00 - Functional-completion closeout

**Phase:** Validation and publication

**Completed**
- Froze the canonical UI integration contract and kept Three.js, Mol*, scientific adapters, camera policy, and validated scene commands independent of the replaceable shell.
- Added RCSB/SIFTS chain and residue-coverage metadata, renderer-agnostic representation/ligand controls, author-numbered residue focus, full-protein camera framing, retry, and clean structure disposal.
- Added runtime validation for SceneController commands, worker output, copilot stream events, structure metadata, and all existing biological payloads.
- Added complete scene context to the streamed Responses API request, explicit stream cancellation, recoverable tool/precondition errors, and a scientifically honest local mode.
- Added focus-visible/reduced-motion/keyboard behavior, isolated shell errors, loading/retry/cancellation paths, security headers, environment/deployment documentation, and production dependency remediation.
- Preserved the official attributable ProteinMPNN 6EHB journey without generating or searching for additional designs.
- Closed the 48-row audit at 39 complete, 9 evidence-backed blocked, 0 partial, and 0 missing.

**Validation**
- `npm run typecheck` - passed.
- `npm test` - 15 tests passed across 3 files.
- `npm run lint` - passed.
- `npm run build` - passed with Next.js 16.2.10 and Webpack.
- `npm audit` - 0 vulnerabilities after upgrading Next.js and pinning patched PostCSS 8.5.10.
- Production QA at 1440 x 900 - passed: universe navigation, complete-corpus query/materialization, predicted and experimental Mol* inspection, verified pLDDT X-Ray and residue focus, RCSB/SIFTS coverage, existing ProteinMPNN candidate/boundary traversal, streamed local copilot tool execution, and preserved universe return context.
- Browser console - 0 warnings/errors. Security headers verified on the production response.

**Evidence-backed blockers**
- Credentialed GPT-5.6 smoke testing requires an external `OPENAI_API_KEY` and model entitlement.
- Learned/hybrid embeddings, scored structural neighbours, PAE interaction, release-keyed IndexedDB, and verified cross-source chain isolation require separately scoped data, infrastructure, or interaction work recorded in the completion audit.
- Total serializable scene-store migration is held for the final presentation integration; the stable replacement contract is complete.

**Git**
- Branch: `agent/functional-completion`.
- Closeout commit: `6ef1320` (`Complete Atlas engine contracts and production hardening`).
- PR: #6, to be updated and marked ready after the publication commit.

---

## 2026-07-20T04:05:00+01:00 - Verified design journey and streamed copilot checkpoint

**Phase:** Functional completion

**Objective**
Replace decorative design choreography with attributable scientific artifacts and make GPT scene control streamed, cancellable and runtime validated.

**Completed**
- Imported the official ProteinMPNN example 6 sequence redesign for reviewed UniProt A5F934 / experimental PDB 6EHB, including exact candidate sequences, scores, sequence recovery, model version, repository commit, seed, temperature, source URLs and limitations.
- Made the evidence boundary explicit: the journey ends before structure prediction, affinity, interface or wet-lab validation because the official example supplies none of those artifacts.
- Added reversible stage navigation, candidate selection and return-to-source commands through the SceneController reducer.
- Replaced unvalidated copilot casts with strict Zod argument schemas and a bounded nine-tool surface.
- Added GPT-5.6 Responses API streaming through a local NDJSON protocol, stale-request abortion, complete query/protein/confidence/design context and an explicit offline stream using the same tool protocol.
- Revalidated Mol* Confidence X-Ray after synchronous plugin disposal; no browser warnings or errors remained.

**Validation**
- `npm run typecheck` - passed.
- `npm test` - 8 tests passed, including the shipped design artifact and rejected copilot arguments.
- `npm run lint` - passed.
- `npm run build` - passed.
- Manual QA at 1440 x 900: A5F934 resolved from the complete reviewed corpus, PDB 6EHB rendered, both ProteinMPNN candidates and the validation boundary were traversable, offline copilot streamed and launched the journey, predicted A0A0R4IVV0 Confidence X-Ray rendered mean pLDDT 89.0 with three very-low-confidence ranges, and the console contained zero warnings/errors.

**Scientific boundary**
- 3HTN was rejected as the showcase target because its linked accession was not returned by the reviewed-UniProt corpus. 6EHB maps to reviewed accession A5F934 and has an official ProteinMPNN homooligomer output, so it remains discoverable through the production Atlas query path.

**Git**
- Branch: `agent/functional-completion`, stacked on `agent/protein-universe` pending PR #5.
- Commit: pending checkpoint commit.

**Next**
Complete residue/chain structure controls, structural-neighbour navigation, persistence/recovery, credentialed GPT QA and end-to-end automation.

---

## 2026-07-20T03:10:00+01:00 - Functional completion: engine, corpus and confidence checkpoint

**Phase:** Functional completion

**Objective**
Establish the replaceable UI boundary, complete spatial navigation, make the full reviewed corpus addressable, and replace the confidence placeholder with verified per-residue AlphaFold data.

**Completed**
- Added the 48-capability completion audit and canonical UI integration contract; recorded that this branch is stacked because PR #5 remains an open draft and `main` does not contain the protein-universe milestone.
- Extracted a reusable camera engine with orbit, truck, pointer-centered dolly, semantic speed/limits, deterministic focus, cancellation, history, home/reset/back, keyboard controls, context restoration and reduced-motion behavior.
- Added runtime-validated scientific schemas for Atlas data, corpus responses, confidence datasets and provenance-carrying design trajectories.
- Added a server-side complete-corpus UniProt adapter with bounded queries, release/total-result provenance, cursor support, cancellation and recoverable local-profile fallback.
- Materialized remote reviewed-UniProt results into stable deterministic Atlas addresses and the live worker/GPU dataset.
- Added an official AlphaFold metadata/confidence adapter that preserves residue numbering, model version, source URL, pLDDT ranges, PAE URL and interpretation limits.
- Registered Mol* model-archive quality assessment explicitly and enabled its pLDDT preset only for predicted structures. Experimental structures remain correctly ineligible.

**Validation**
- `npm run typecheck` - passed.
- `npm test` - 6 tests passed.
- `npm run lint` - passed.
- `npm run build` - passed; API routes are dynamic and the page remains statically rendered.
- Manual QA at 1440 x 900: 75,000-protein field held 60 FPS; complete-corpus query `P69905` resolved and materialized; experimental PDB 1A00 rendered; predicted A0A0R4IVV0 resolved mean pLDDT 89.0 and three very-low-confidence ranges.
- Console was clean before X-Ray. A duplicate Mol* custom-property warning on mode remount was identified and corrected by disposing plugin registrations before deferred nested React teardown; revalidation remains in the next checkpoint.

**Git**
- Branch: `agent/functional-completion`, stacked on `agent/protein-universe` pending merge of PR #5.
- Commit: pending checkpoint commit.

**Next**
Complete the provenance design journey, streaming validated GPT-5.6 tool path, structure residue controls, failure recovery and end-to-end coverage.

---

## 2026-07-18T20:25:00+01:00 - Protein universe milestone

**Phase:** Full-scale Atlas implementation

**Objective**
Replace the direct-to-1EMA integration proof with a navigable, queryable, multiscale universe built from real protein records.

**Completed**
- Built an unrestricted reviewed-UniProt ingestion pipeline with deterministic annotation-family spatialization, provenance-bearing manifests, progressive shards, and CI artifacts.
- Measured the complete reviewed corpus at 575,503 proteins, 55,558 annotation families, 39,017 PDB-linked records, and 241 MB uncompressed.
- Published a measured browser delivery profile containing 75,000 proteins, 19,451 families, 22,429 PDB-linked records, and 64 shards (34 MB uncompressed). This is a deterministic derivative of the full query, not a hand-authored fixture.
- Replaced the hardcoded 1EMA entry flow with a persistent Three.js universe, semantic region/family LOD, direct spatial navigation, worker-backed multi-field search, query-driven scene focus, and camera-context restoration.
- Added typed copilot commands for atlas query, region focus, protein flight, structure return, color changes, and design requests through the shared SceneController boundary.
- Deferred molecular coordinates until selection, then resolved real RCSB BinaryCIF or AlphaFold mmCIF structures in Mol*. Added an explicit caveat that linked PDB records may cover only a domain, chain, or complex fragment.
- Corrected a Mol* nested-React-root teardown race found during universe-to-structure-to-universe QA.
- Extended the reference synthesis with AIR and Wembi while preserving Helicase's camera-as-understanding interaction model.

**Scale decision**
- Direct local UniProt requests were blocked by environment DNS (`ERR_NAME_NOT_RESOLVED` / `Could not resolve host`). GitHub Actions completed the same unrestricted query in 131 seconds.
- The full 241 MB static output was retained as the authoritative build artifact. The 75k profile was selected for live delivery after measuring initial transfer, JSON parsing, and browser-memory implications; all contracts remain scale-independent.

**Validation**
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run build` - passed with Next.js 16.1.6 and Webpack.
- Full-data production QA at 1440 x 900 - passed.
- 75,000 records reached ready state in 4.8 seconds on the local production server.
- Universe and query states held 60 FPS; observed heap settled near 98-158 MB after loading, with a transient 210 MB peak during dev/HMR query reconstruction.
- Multi-constraint query `membrane proteins in humans` returned 240 Homo sapiens matches and reduced the scene to 240 addressable protein points.
- RCSB PDB 5X1G and AlphaFold A0A075F7E9 both rendered successfully in Mol*.
- Query clear restored the pre-query universe framing; structure return restored query and camera context.
- Browser console - zero warnings or errors in the final production journey.

**Git**
- Branch: `agent/protein-universe`.
- Logical commits include full-corpus pipeline, browser delivery profile, universe renderer/query system, Mol* teardown correction, and measured architecture/design documentation.
- Draft PR: pending final push.

**Next**
Replace annotation-family coordinates with a versioned learned embedding projection while preserving IDs and shard contracts; add verified structure coverage and AlphaFold confidence extraction before enabling Confidence X-ray.

---

## 2026-07-18T17:32:39+01:00 — Mol* structure presentation correction

**Phase:** Blocking visual defect

**Objective**
Make the cited 1EMA structure scientifically legible, visually native to Atlas, and reliable across the universe-to-structure transition.

**Completed**
- Replaced the default Mol* presentation with an opaque, high-quality cartoon polymer representation and element-colored ball-and-stick ligand support.
- Corrected BinaryCIF loading, camera reset, whole-structure framing, exposure, ambient light, interior darkening, and postprocessing.
- Removed the white/checkered Mol* viewport, duplicate procedural molecule, and CSS class collisions that distorted the Atlas copilot.
- Isolated each Mol* React root so remounts and scene round trips do not reuse a stale container.
- Moved structure actions and provenance status outside the molecular focal area while retaining the RCSB 1EMA citation and experimental-evidence boundary.
- Pinned production builds to Webpack after Turbopack emitted a missing Mol* module factory despite compiling successfully.

**Files**
- Added: None.
- Modified: `.gitignore`, `app/globals.css`, `app/layout.tsx`, `package.json`, `src/components/AtlasExperience.tsx`, `src/components/StructureView.tsx`, `src/components/WorldCanvas.tsx`.
- Removed: None.

**Validation**
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — passed with Next.js 16.1.6 and Webpack.
- Manual production QA — passed at 1440 x 900; 1EMA remained centered and complete through universe -> structure -> universe -> structure.
- Browser console — zero errors; one upstream Three.js deprecation warning remains.

**Git**
- Branch: `agent/atlas-foundation`.
- Commit(s): Branch head — `Fix Mol* structure presentation`.
- PR: Existing feature branch; no PR requested for this correction.
- Status: Validated and ready to commit and push.

**Codex**
- Session ID: Pending (`/feedback`).

**Next**
Add a verified AlphaFold entry and confidence fixture before enabling the confidence X-ray for predicted structures.

---

## 2026-07-18T16:30:00+01:00 — Atlas foundation

**Phase:** Implementation

**Objective**
Establish the first runnable, single-screen Atlas experience and its typed scene-command boundary.

**Completed**
- Added strict Next.js/TypeScript application foundation and an interactive Three.js protein-universe scene.
- Implemented deterministic map → structure → confidence X-ray → design-reveal choreography.
- Added server-side GPT-5.6 Responses API route with bounded tool schemas and an explicitly labelled offline fallback.
- Copied unmodified canonical logo variants into `public/brand/logo/` for application use.
- Kept design playback visibly labelled as a development choreography fixture pending verified scientific trajectory data.

**Files**
- Added: application foundation, domain contracts, scene renderer, copilot API route, public brand derivatives.
- Modified: README.
- Removed: None.

**Git**
- Branch: agent/atlas-foundation.
- Commit(s): Pending at the time of log entry.
- PR: None — `gh pr create` was rejected: `Automatic approval review failed: You've hit your usage limit. Upgrade to Plus to continue using Codex (https://chatgpt.com/explore/plus), or try again at Aug 17th, 2026 3:48 PM.`
- Status: Local implementation validated; feature branch prepared.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Import real Mol* structure rendering and verified precomputed design trajectories; then enable a credentialed GPT-5.6 demo flow.

---

## 2026-07-18T16:08:34+01:00 — Real structure adapter and evidence correction

**Phase:** Implementation

**Objective**  
Replace the molecular silhouette path with a browser-native Mol* adapter while removing unsupported scientific claims from the current fixture.

**Completed**
- Added a client-only Mol* adapter that downloads and renders the cited RCSB BinaryCIF structure for PDB 1EMA.
- Made the density field, experimental evidence, unavailable pLDDT confidence, and design choreography fixture explicit in the interface.
- Prevented the experimental PDB entry from invoking a prediction-confidence X-ray until a verified predicted fixture exists.
- Isolated Mol* from Next.js server prerendering after its plugin runtime proved browser-only.

**Files**
- Added: `src/components/StructureView.tsx`.
- Modified: molecular fixture/domain contracts, scene composition, GPT fallback, styles, package manifests, decisions.
- Removed: None.

**Git**
- Branch: agent/atlas-foundation.
- Commit(s): Pending at the time of log entry.
- PR: None — see the prior entry for the exact Codex usage-limit rejection.
- Status: Validated locally; ready to commit and push.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Commit a verified AlphaFold entry with real pLDDT data to unlock the confidence X-ray, then import the first verified RFdiffusion trajectory.

---

## 2026-07-18T16:24:00+01:00 — Publish structure adapter

**Phase:** Implementation

**Objective**
Publish the cited-structure adapter and preserve the evidence boundary for the next implementation session.

**Completed**
- Pushed the Mol* adapter and evidence correction to the feature branch.
- Confirmed typecheck, lint, and production build success.

**Files**
- Added: None.
- Modified: Development log.
- Removed: None.

**Git**
- Branch: agent/atlas-foundation.
- Commit(s): 23096d7.
- PR: None — `gh auth status` reports that the EriMore keyring token is invalid and requires `gh auth refresh -h github.com`.
- Status: Branch pushed successfully; draft PR remains blocked by GitHub CLI authentication.

**Codex**
- Session ID: Pending (/feedback)

**Next**
Import a verified AlphaFold confidence fixture, then replace the design choreography fixture with a provenance-carrying offline trajectory.

---
