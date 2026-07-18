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
