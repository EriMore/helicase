# Claude Takeover Audit

Prepared by: Claude (Founding CTO / Principal Engineer role, per `AGENTS.md`)
Date: 2026-07-21
Scope: evidence-based state of the repository at `main`@`a748204`, and disposition of the last open PR (#7). No application code was changed to produce this audit.

Authority order followed throughout: `AGENTS.md` → exported Claude Design (`prototypes/claude-design-final/`, mirrored in `docs/design/final/`) → existing production engine (data, Mol*, search, SceneController, camera) → everything else.

---

## 0. How this was established

`git status` clean on `claude/helicase-atlas-handoff-jawzuk` (= `main`@`a748204`). `git fetch --all` surfaced 9 remote branches + 1 tag beyond `main`. `gh`-equivalent (GitHub MCP) enumerated all 9 PRs (1–9); 8 are closed/merged, **PR #7 is the only open PR**, and it is a draft. Read in full: `AGENTS.md`, `CLAUDE.md`, `README.md`, every `docs/design/final/*.md`, `docs/design/final/manifest.json`, `docs/planning/PRODUCT_COMPLETION_AUDIT.md`, `docs/engineering/DEPLOYMENT.md`, `docs/AI_DEVELOPMENT_LOG.md`, and every file under `src/`, `app/`, `public/workers/`. Ran `npm ci && npm run typecheck && npm test && npm run lint && npm run build` against the current tree (dependencies were not pre-installed in this container) to establish current production build behaviour first-hand rather than trusting the last log entry.

---

## 1. Current implemented state

### 1.1 Data pipeline — mature, authoritative, keep entirely
- `scripts/build-atlas.mjs` + `.github/workflows/build-protein-atlas.yml` produce a reproducible, provenance-bearing build from the **complete reviewed UniProtKB/Swiss-Prot corpus (575,503 records, 55,558 annotation families)**, and a measured **75,000-record / 64-shard browser delivery profile** (`public/data/atlas/manifest.json` + `shards/*.json`, 34 MB uncompressed).
- `app/api/atlas/search/route.ts` queries the **live, complete** reviewed corpus server-side (not just the staged 75k) with cursor pagination, release/total-result provenance, and abortable fetches. This is real, working, and exactly matches the dossier's "complete protein universe as target scope" mandate.
- Spatialization (`src/domain/spatialization.ts`) is an honest, explicitly-labelled **deterministic UniProt annotation-family hierarchy** — 12 semantic regions (`catalysis, transport, signalling, genome, expression, immunity, structure, metabolism, membrane, viral, regulation, unresolved`) classified by regex over name/family/organism, then hashed into a spherical cluster placement. `explainProximity()` correctly refuses to call this structural or sequence similarity. **This is real, but it is not the same taxonomy as the design's 6-hue territory palette** (see §3).

### 1.2 SceneController — real, single mutation boundary, keep and extend
- `src/domain/atlas.ts` (`SceneState`/`SceneCommand`/`reduceScene`) is a pure reducer. Every mutation — direct user interaction and every GPT tool call — passes through `sceneCommandSchema.safeParse` (`src/domain/schemas.ts`) before `dispatch`. This is exactly the "SceneController as sole mutation boundary" pattern the dossier and design handoff require, and it is real (not aspirational): `AtlasExperience.tsx`'s `issue()` is the only path that calls `dispatch`.
- Current `SceneMode` union: `landing | universe | diving | structure | xray | designing | designComplete`. The design's 5-level hierarchy (Universe → Territory → Neighbourhood → Protein → Structure) and 9-plus named states in `SCREEN_STATE_MATRIX.md` do not exist as modes yet — `universe` currently conflates Universe/Territory/Neighbourhood into one continuous camera-driven space with no `glance` (Protein/identity) state distinct from `structure`. Selecting a protein currently jumps straight to structure-adjacent framing; there is no intermediate "bracket-marker + identity panel, structure not yet mounted" Glance state.

### 1.3 Camera engine — real, physically sound, constants diverge from the design contract
- `src/engine/camera-navigation.ts` is a genuine spherical-camera engine: orbit, truck (pan), pointer-anchored dolly, keyboard movement, 32-entry history stack, home/reset/back, `reducedMotion` flag, snapshot capture/restore (`snapshot()`/`restore()`/`capture()`). This is real engineering, not a stub, and directly supports the Depth Rail's "exact camera restore" requirement at the data-structure level.
- **Divergences from `MOTION_AND_CAMERA_SPEC.md`:** production clamps `r` to **[8, 520]**, FOV **42°**; the design contract specifies `r` **[40, 1700]**, FOV **46°**. Production drives all transitions through one continuous critically-damped exponential follow (`factor = 1 - exp(-dt·9.5)`); the design contract specifies **discrete per-transition tween durations** (1600ms select, 1500ms enter-territory, 1500ms inspect, 1400ms design-start, 1300ms returns) on an explicit **easeInOutCubic** curve, with the damped follow sitting *under* those tweens, not replacing them. Today there is no per-transition duration table and no easing-curve implementation — only the single always-on damping constant. This needs closing (§4), not replacing wholesale: the snapshot/restore mechanism is already correct.

### 1.4 Universe renderer — real GPU rendering, single dark theme only
- `WorldCanvas.tsx`: genuine instanced `THREE.Points` rendering for clusters and proteins, custom GLSL vertex/fragment shaders (soft circular sprites, perspective-scaled size, fog fade), raycast picking, distance-based opacity/LOD, ambient slow rotation, dust field. This is a real, working renderer at the current 75k/19k-cluster scale — not a placeholder.
- It renders **exactly one visual theme** — the pre-Claude-Design dark space aesthetic (`additive` blending always on, `#02040a` fog) — with **no light/dark toggle**, no territory palette (uses 12 semantic-region hues, not the design's 6), no GPU picking acceleration beyond brute-force `raycaster.intersectObject` (flagged as a scaling risk in `IMPLEMENTATION_NOTES.md` and still unaddressed), and no frustum culling beyond shader-side fog fade.

### 1.5 Mol* structure adapter — real, production-grade, keep and extend
- `StructureView.tsx` mounts real Mol* (`molstar` 4.11.0), fetches real coordinates (`models.rcsb.org/*.bcif` for experimental, `alphafold.ebi.ac.uk/files/AF-*-model_v6.cif` for predicted), applies `MAQualityAssessment`/`QualityAssessmentPLDDTPreset` for verified pLDDT coloring gated strictly to predicted structures, supports cartoon/surface/ball-and-stick (no spacefill — design wants 4 options), residue-range focus via real MolScript queries + `camera.focusLoci`, and disposes/remounts cleanly (the corrected teardown race from the 2026-07-18 log entry). This is the strongest-fidelity subsystem in the repo relative to the design's *representation semantics* — it needs restyling and a spacefill option, not re-architecture.
- `app/api/structure/confidence/route.ts` and `app/api/structure/metadata/route.ts` are real AlphaFold DB and RCSB/SIFTS adapters — verified residue-keyed pLDDT with source URL/model version/limitations, and chain/UniProt coverage mapping with explicit caveats. Both are honest, schema-validated, and cache-appropriate (`s-maxage=86400`).

### 1.6 Search — real, dual-path, functioning
- `public/workers/atlas-search.js`: off-main-thread, weighted multi-field scoring across loaded shards, alias expansion (`human → homo/sapiens`), stop-word filtering. `useProteinAtlas.ts` combines this with the live complete-corpus API search, deduplicates, and materializes remote hits into the live scene + worker index. This is the "Query the Universe" deterministic path from the design, functionally complete, just needs the design's visual treatment (suggestion chips, result-count chrome, `dimNon` reflow).

### 1.7 Copilot / Ask Atlas — real streaming + real tool boundary, wrong presentation
- `app/api/copilot/route.ts` streams the real OpenAI Responses API (NDJSON protocol) when `OPENAI_API_KEY` is present, with an honest, clearly-labelled `local-explicit` keyword fallback when it is absent (never impersonates GPT). Tool calls are Zod-validated twice (`copilot-tools.ts` on the server, `parseCopilotToolCall` again on the client) before touching `SceneController`. This is a real, load-bearing implementation of the dossier's "reasoning that drives the scene" thesis.
- **Presentation is wrong relative to the design:** the copilot renders as a **permanently-mounted bottom-right panel** (`<section className="copilot ...">`, `AtlasExperience.tsx:310`) that only fades/shrinks (`copilot-dormant`) on the landing screen — never fully unmounts, never requires ⌘K, and shows no visible `▸ scene.method(...)` action trace to the user (tool calls are applied silently; only prose streams). `DESIGN_TARGET.md`'s explicit non-goal — "Do not add a persistent chatbot sidebar" — is currently violated by the shipped UI, even though the underlying engine is sound.

### 1.8 Protein-design journey — real, scientifically honest, narrower than the design's stage count
- `public/data/design/proteinmpnn-6ehb.json`: a real imported artifact — the official `dauparas/ProteinMPNN` example 6 output for UniProt A5F934 / PDB 6EHB, with exact sequences, scores, sequence recovery, git commit, seed, temperature, license, and an explicit **validation-boundary stage** that stops before RFdiffusion, predicted-fold, interface, or wet-lab claims. This is precisely the scientific-integrity posture `SCIENTIFIC_DATA_BOUNDARIES.md` demands, and it is real data, not fixture.
- It ships as **3 stages** (Source complex → Sequence generation → Validation boundary) versus the design's **9-stage** scaffold (Target/Objective/Site/Backbone/Sequence Design/Predicted Fold/Metrics/Compare/Candidate). This is not a bug — production only has real evidence for roughly the first 2–3 of those 9 conceptual stages — but the presentation layer needs to adopt the design's 9-slot vertical stage list with stages 4–9 rendered as explicit "unavailable / evidence gate" states (not skipped, not invented), matching `VISUAL_ACCEPTANCE_CRITERIA.md`'s "every stage explicitly labeled, no fake progress" requirement.

### 1.9 What is entirely absent
No Depth Rail (5-level clickable backstack with exact per-level camera restore — today there is a static 3-item decorative label column). No Glance/Learn two-tier identity disclosure (today: one flat `<dl>` with 4 rows). No relationship threads UI (the `explainProximity()` signal generator exists in `spatialization.ts` but is never called from any component or route — dead code, not wired). No sequence tray/viewer (no component, no hook, no data field for sequence anywhere in `AtlasProtein`). No theme system (light/dark) — `globals.css` is a single hardcoded dark palette, `Arial/Helvetica` sans body font (the design forbids any default sans-serif UI font). No sound system. No Spectral/IBM Plex Mono typography. No "specimen glass" panel treatment. No scrims/vignette for text-over-field legibility.

### 1.10 Current production build behaviour (measured this session)
- `npm ci` — clean install, 567 packages, 0 vulnerabilities.
- `npm run typecheck` — **passes**, 0 errors.
- `npm test` — **passes**, 15/15 tests across 3 files (`src/domain/atlas.test.ts`, `src/domain/schemas.test.ts`, `src/engine/camera-navigation.test.ts`).
- `npm run build` — **passes** (`next build --webpack`, Next.js 16.2.10): 1 static page (`/`), 4 dynamic API routes.
- `npm run lint` — **fails, 2 errors**, both inside `prototypes/claude-design-final/support.js` (`ReactDOM.render` deprecated; `no-assign-module-variable`). `eslint.config.mjs` only `globalIgnores([".next/**", "node_modules/**"])` — it does not exclude `prototypes/**`, so ESLint is linting the **unmodified, vendor-authored DC runtime** that `docs/design/final/README.md` explicitly says must ship "unmodified." This is a real, currently-reproducible regression (introduced when PR #8 added the prototype folder to the repo) that was not caught because no CI workflow runs lint/typecheck/test/build on pull requests — `.github/workflows/build-protein-atlas.yml` is the only workflow, and it is scoped to `push`/`workflow_dispatch` on the now-merged `agent/protein-universe` branch only, not to PRs against `main` or `integration/claude-handoff`. **Flagged for the first implementation session to fix** (add `globalIgnores(["prototypes/**"])`) — not fixed here per the audit's no-application-code-changes constraint; `eslint.config.mjs` is arguably infrastructure rather than application code, but it was left untouched to keep this audit's diff to documentation only.

---

## 2. Latest PR disposition — PR #7 "Build the cinematic design trajectory reveal"

Full detail and exact rationale in `LATEST_PR_INTEGRATION_PLAN.md`. Summary verdict: **cherry-pick the state-machine and reducer logic; reject the presentation.**

PR #7 branches from `main`@`1c3157c` — the tip **before** PR #8/#9 merged the Claude Design reference package. It is draft, unreviewed, has 0 CI checks (none configured), 13 files changed, +120/−11. It adds: `PLAY_DESIGN_TRAJECTORY` / `PAUSE_DESIGN_TRAJECTORY` / `STEP_DESIGN_STAGE` / `SEEK_DESIGN_STAGE` / `RESTART_DESIGN_TRAJECTORY` / `COMPARE_DESIGN_CANDIDATES` scene commands, a `design_binder` copilot tool (an eligibility mapper onto the same real 6EHB artifact — it does not generate sequences), and matching JSX/CSS in the old shell (`AtlasExperience.tsx`, `globals.css` dark styling), plus doc/log updates.

- **Merge unchanged:** none of the JSX/CSS — it targets DOM structure and classnames that the final Claude-Design presenter will not have.
- **Cherry-pick / adapt:** the `SceneCommand` additions and reducer cases in `src/domain/atlas.ts`, the `design_binder` tool + schema in `copilot-tools.ts`/`schemas.ts`, and the corresponding test cases. These are real, scientifically-honest, evidence-boundary-preserving engine additions that the design's Design Trajectory Panel (§6 of `SCREEN_STATE_MATRIX.md`, stage stepping/scrubbing) will need regardless of which component renders it.
- **Reject:** every markup/CSS change (all 13 files' non-`src/domain/*` portions except the doc updates, which are superseded by this audit's own docs).
- **Note:** PR #7's README addition has a duplicated line (copy-paste artifact — same sentence appears twice in the diff) — evidence this was not carefully reviewed even by its author; another reason not to merge as-is.

---

## 3. Design-to-engine delta

| Area | Design target (`docs/design/final/`) | Current engine | Verdict |
|---|---|---|---|
| Loading | Static logo, scan-line, "Resolved N of 575,503," honest deterministic completion | `AtlasExperience.tsx` loader: animated orbiting-ring loader with 3 pulsing dots (`loader-orbit`), a moving gradient scan bar keyed to `atlas.progress` — closer to "progress sparkle" than the design's restrained static-logo + thin-scan-line contract | **Adapt**: replace orbit-ring/pulse animation with static logo + single `hx-scan` sweep; keep the real progress/coverage data already flowing from `useProteinAtlas` |
| Universe | 5-level hierarchy, 6-territory palette, ambient drift 0.00022 rad/frame only in Universe/Territory | 3-mode continuum (`landing/universe/diving`), 12-region palette, ambient rotation always applied via `clusters.rotation.y = sin(...)` regardless of mode | **Adapt**: reconcile 12 semantic regions → design's 6-hue territory palette (recommend keeping 12 regions as the *data* taxonomy but rendering them through 6 assigned territory hues — do not discard the finer classification, which is real) |
| Territory / Neighbourhood | Distinct `territory` view, family expands ×1.7, others dim to `dimNon`, exact camera snapshot on entry | No distinct territory state; `focusCluster`/`FOCUS_REGION` reframes camera but does not expand/dim per the design's factor, and camera restore uses a single `cameraContext` slot, not a `levelCam{}` stack | **Build**: add `territory` mode + `levelCam` stack (extends `CameraNavigation.history`, which already exists) |
| Protein (Glance) | Bracket marker, identity panel rises, Glance is default tab, family stays lit/rest dims to 0.6 | No distinct Glance state — selection jumps toward structure; `specimen-card` shows 4 flat rows, no bracket marker, no dim-to-0.6 | **Build** |
| Learn | Richer rows + Domains + References, second-tier tab | Absent entirely — no domain data field on `AtlasProtein` | **Build**, and source real UniProt feature/domain records (do not seed-random-generate per `SCIENTIFIC_DATA_BOUNDARIES.md`) |
| Relationships | ≤3 curated threads, off by default, typed/sourced/attributed | Absent in UI; `explainProximity()` exists but unused | **Build** UI + wire the existing function; extend with real annotation/database edges beyond region/family/organism matches before calling it "computed similarity" |
| Sequence tray | Full-width bidirectional viewer, virtualized for >4,000 residues | Absent entirely | **Build** from scratch; UniProt REST sequence field is not yet fetched anywhere in the app |
| Structure controls | Cartoon/Surface/Ball&Stick/Spacefill, chain color mode, ligand toggle | Cartoon/Surface/Ball&Stick (no Spacefill), no chain/domain color mode, ligand toggle present | **Adapt**: add Spacefill representation (Mol* supports it natively) and a color-mode toggle |
| Confidence X-Ray | 4-stop gradient + legend, gated to predicted only | Real, verified, correctly gated — legend/gradient present in prose but not the visual gradient-legend chrome | **Restyle only** — engine is correct |
| Ask Atlas | Summonable ⌘K, dismissible, visible action trace, never a sidebar | Permanent bottom-right panel, no ⌘K, no visible trace UI, never fully unmounts | **Build presentation**, keep the streaming/tool engine entirely |
| Query | Deterministic, visually distinct from Ask Atlas | Deterministic, visually distinct (different panel, different data shape) — directionally correct | **Restyle** |
| Protein design | 9 explicit stages, permanent disclaimer, precomputed language | 3 real stages + PR #7's unmerged play/scrub controls; correct evidence boundary; permanent disclaimer present in prose | **Restyle to 9-slot scaffold** with stages 4–9 as explicit unavailable/evidence-gate states; adopt PR #7's playback reducer cases |
| Return navigation | Exact snapshot restore per level via `levelCam{}`, `Esc` = one level | Single `cameraContext` slot restores only the pre-query context; no per-level stack, `Backspace`/`Home` exist but no `Esc`-per-level semantics | **Build** on top of existing `CameraNavigation.history` (already a stack, just not surfaced as `levelCam` per depth level) |
| Light mode | Flagship — warm paper, ink text, matte point blending | Does not exist | **Build** |
| Dark mode | "Specimen Chamber," equally authored, additive point blending | The *only* existing theme, but as the old Codex-era dark palette, not the design's authored dark tokens | **Replace** with `DESIGN_TOKENS.md` dark values |
| Accessibility | Visible focus states, keyboard reachability, reduced-motion honored globally | `:focus-visible` outline present; `world-canvas` has full keyboard nav + `aria-label`/`aria-describedby`; `reducedMotion` flag exists on `CameraNavigation` but is never actually read from `prefers-reduced-motion` before being wired in — confirmed: `WorldCanvas.tsx:191` does read `window.matchMedia("(prefers-reduced-motion: reduce)")` correctly | **Mostly present** — extend to future panel components |
| Error states | Explicit zero-result, retry-structure, `deny` cue, "stay put" data-miss | Retry-structure button present (`RETRY_STRUCTURE`); zero-result query messaging present (`"No indexed signals yet"`); no sound cues at all (no sound system exists) | **Adapt** once sound system exists |

---

## 4. Final implementation roadmap (dependency order, not cosmetic order)

1. **Design token + typography system.** Land `DESIGN_TOKENS.md` as real CSS custom properties (light + dark), self-hosted Spectral + IBM Plex Mono, theme toggle with `localStorage` persistence. Nothing downstream can be visually verified against the design without this landing first, and it touches every component.
2. **Camera contract closure.** Add the missing duration/easing table (easeInOutCubic, per-transition ms) as a layer on top of the existing `CameraNavigation` (do not replace the class — its snapshot/history/damping primitives are correct); reconcile `r`/FOV clamps to the design's `[40,1700]`/46°; promote the single `cameraContext` slot to a `levelCam{}` map keyed by depth level.
3. **Scene-mode expansion.** Extend `SceneMode` to the 5-level hierarchy (`universe | territory | glance | inspect | design`, replacing `diving/structure/xray/designing/designComplete` naming to match the design's vocabulary) in `atlas.ts` + `schemas.ts`, since every subsequent UI component keys off this.
4. **Depth Rail component**, built on (2) and (3) — the primary navigation instrument; everything else can be reached and demoed once this exists.
5. **Territory/Neighbourhood rendering** in `WorldCanvas.tsx` — 6-hue territory mapping over the existing 12-region data, ×1.7 focus expansion, `dimNon` factor, ambient-drift gating to Universe/Territory only.
6. **Identity panel (Glance/Learn)** + real domain/pathway/disease data sourcing from UniProt (extend `AtlasProtein`/the corpus-search parser, not fixture generation).
7. **Relationship threads UI**, wired to `explainProximity()`; extend its signal set with any additional real cross-references available from UniProt (cross-references, complex/interaction annotations) before shipping — do not present region/family/organism coincidence alone as "relationships" without the same explicit caveat it already carries.
8. **Sequence tray** — new hook to fetch real UniProt sequence, virtualization for >4,000 residues, bidirectional Mol* selection linking (Mol* selection API is already proven in `StructureView.tsx`'s residue-focus code path — extend it, don't rebuild it).
9. **Structure panel restyle** — add Spacefill + chain/domain color mode to the existing `StructureView.tsx`; apply design tokens to controls.
10. **Confidence X-Ray restyle** — gradient legend chrome only; engine is done.
11. **Design journey restyle** — 9-slot scaffold with explicit evidence-gate stages 4–9; cherry-pick PR #7's playback reducer cases (§2) for stage stepping/scrubbing across the 3 real stages.
12. **Ask Atlas rebuild** — ⌘K summon/dismiss, visible `▸ scene.method(...)` trace rendering, remove the permanent panel; keep `app/api/copilot/route.ts` untouched.
13. **Sound system** — new, from `SOUND_SPEC.md`; lowest product risk, do last.
14. **Fix `eslint.config.mjs`** to exclude `prototypes/**` (currently failing lint on vendor code) — cheap, should happen in the very first implementation commit alongside step 1, not deferred to step 13.
15. **Add a CI workflow** that runs `typecheck`/`test`/`lint`/`build` on pull requests against `main` and `integration/claude-handoff` — currently no PR in this repository has ever been gated by CI.

---

## 5. Validation matrix

Full per-criterion mapping (implementation location / data source / test / visual evidence / status) is in `FINAL_ACCEPTANCE_MATRIX.md`. High-level rollup against `VISUAL_ACCEPTANCE_CRITERIA.md`'s sections:

| Section | Status |
|---|---|
| Brand & logo | Partial — canonical assets present under `public/brand/logo/`, used in header/loading, but loading-screen treatment (orbiting rings, not static+scanline) does not match |
| Color discipline | Fail — no light mode exists at all; dark mode uses old palette, not `DESIGN_TOKENS.md` values; teal is not a semantic-only signal because the design's teal system isn't implemented |
| Navigation & camera | Partial — direct manipulation (orbit/pan/zoom/dolly) is real and functionally close; exact-restore-per-level and duration/easing contract are not yet built |
| Density & scale honesty | Pass on substance (75k real points, honest UI copy on 75,000 vs 575,503), fail on presentation polish (no dense-but-breathable authored field per territory) |
| Identity & disclosure | Fail — no Glance/Learn tiers, most claimed fields absent |
| Sequence | Fail — not implemented |
| Relationship threads | Fail — not implemented (data function exists, unused) |
| Structure & confidence | Pass on engine correctness; partial on control completeness (no Spacefill/chain-color) |
| Protein design journey | Partial — real, honest, evidence-bounded data; presentation is 3-stage flat panel, not the 9-slot scaffold |
| Query vs Ask Atlas | Partial — behaviorally distinct and real, but Ask Atlas violates the "never a persistent sidebar" rule and shows no visible trace |
| Accessibility & robustness | Partial — solid keyboard/reduced-motion foundation in the world canvas; not yet extended to panels that don't exist yet |
| Light + dark parity | Fail — light mode does not exist |

---

## 6. Risks

- **Performance at 75k GPU points with brute-force raycasting.** `IMPLEMENTATION_NOTES.md` flagged this explicitly and it remains unaddressed — `WorldCanvas.tsx`'s `findProtein()`/`findCluster()` still raycast against the full point buffer on every pointer move. Acceptable today; will degrade picking latency as territory/neighbourhood interaction density increases. Add GPU picking or a spatial index before wiring hover-heavy interactions like relationship-thread hover-emphasis.
- **Data volume / memory.** Documented settled heap 98–158 MB, transient 210 MB during dev/HMR (from the 2026-07-18 log). Adding sequence data (real UniProt sequences, some >30,000 residues for titin-scale proteins) and relationship-graph payloads will add meaningfully to this; virtualize the sequence tray from day one per the design's own requirement.
- **Rendering — theme system touches the shader material.** `WorldCanvas.tsx`'s `makePointMaterial()` hardcodes `THREE.AdditiveBlending`; the design requires **normal** blending in light mode and additive only in dark. This must become a material-recreation-on-theme-change path, not a CSS-only swap — budget real engineering time for it, not just a token change.
- **Worker boundary.** `atlas-search.js` and `useProteinAtlas.ts` are schema-validated at the message boundary (`atlasWorkerMessageSchema`) — solid. No risk identified here beyond scale (§ above).
- **Mol* lifecycle.** Already hardened against the 2026-07-18 teardown race (deferred nested-root unmount after synchronous `plugin.dispose()`). Any new UI (sequence tray triggering residue selection from outside `StructureView`) must go through the same `focusRange`-prop pattern, not a new imperative ref, to avoid reintroducing lifecycle bugs.
- **Camera continuity across the mode-vocabulary migration (§4 item 3).** Renaming `SceneMode` values is a breaking change to every `state.mode === "..."` check across `AtlasExperience.tsx`, `WorldCanvas.tsx`, and `StructureView.tsx`. Do this as a single atomic commit with the full test suite re-run, not incrementally.
- **Sequence scale.** Titin-class proteins (~34,350 aa) are explicitly called out in the design as requiring virtualization + domain overview, never a single unbroken line. No sequence data source is wired yet — build the virtualization contract before the first real sequence ships, not after.
- **Provenance.** Strong today — every structure, confidence value, and design-stage carries source/method/version/limitations. Preserve this discipline as new subsystems (relationships, sequence, domains) are added; do not let the Learn tab's richer fields regress to unsourced prose.
- **Hallucinated scientific content.** No evidence of fabrication found anywhere in the current engine — the opposite risk exists: the *design* implies more (9 design stages, rich Learn-tab fields, homologues) than production can currently source. The roadmap in §4 is ordered to close this gap with real data, not filler.
- **Design drift.** The single largest risk to the project's stated goal. The shipped UI today is, presentation-wise, still substantially the "former Codex interface" `DESIGN_TARGET.md` explicitly forbids reverting to (permanent chatbot corner panel, dark-only theme, generic dashboard-style flat identity card). This is not a small delta — it is close to a full front-end rebuild against an engine that is otherwise in good shape.
- **Prototype/production incompatibility.** The prototype is a single 110KB `.dc.html` file with inline React-like templating and CDN-loaded three.js/fonts — it is a reference, not a component library. Nothing in it should be imported directly; every visual/interaction contract must be reimplemented against the real Next.js/React/TypeScript stack, per `IMPLEMENTATION_NOTES.md`.
- **Browser support.** Not evaluated this session (no browser QA was performed — this audit changed no application code and the instructions here were documentation-only). Flag for the first implementation session: `backdrop-filter` (specimen-glass) support and WebGL point-sprite/shader behavior across target browsers.
- **CI gap.** No workflow gates any PR (see §1.10). Recommend closing this early (§4 item 15) so the coming large UI rebuild doesn't land unverified commits the way PR #7 did.

---

## 7. Branch strategy

- **PR #7** (`agent/design-trajectory-reveal` → `main`): close without merging once its two engine-logic files (`src/domain/atlas.ts` reducer cases, `src/domain/copilot-tools.ts`/`schemas.ts` `design_binder` tool) are cherry-picked by hand into the branch that builds the real Design Trajectory Panel (roadmap item 11). Do not merge its markup/CSS. See `LATEST_PR_INTEGRATION_PLAN.md` for the exact commit-by-commit rationale.
- **This audit's branch** (`claude/takeover-audit`): documentation only, branched from `origin/integration/claude-handoff` (not `main`) so its diff is limited to the five new `docs/handoff/*.md` files, with no unrelated `CLAUDE.md`-commit noise. PR opened against `integration/claude-handoff` per the task instructions.
- **Next implementation branch**: cut from `main` (which already contains `integration/claude-handoff` + `CLAUDE.md`) once this audit PR merges, or fast-followed in parallel — the audit does not block implementation start, since no application code changes are gated on it.
