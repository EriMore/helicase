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
