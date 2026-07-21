# Design Delta

Deviations from `docs/design/final/` and the exported Claude Design prototype, discovered during the final-implementation pass on `claude/final-implementation`. Each entry states the target behaviour, what shipped instead, why, its impact, and whether it is temporary.

---

## 1. Protein-design journey is a continuous 6-beat timeline, not 9 discrete click-through stages

**Target:** `SCREEN_STATE_MATRIX.md` §6 specifies 9 named stages (Target/Objective/Binding Site/Backbone/Sequence Design/Predicted Fold/Metrics/Compare/Candidate) advanced by explicit Next/Back clicks.

**Implemented:** A continuous `progress: 0..1` value across 6 beats (Target & Site, Backbone Candidates, Sequence Design Candidates, Predicted Fold & Metrics, Compare, Resolve), auto-playing in real time with pause/resume/scrub via a range input (`src/components/DesignPanel.tsx`).

**Reason:** Explicit instruction for this implementation pass: "the final production experience must become a continuous, on-screen, in-flight spatial sequence… Do not require the user to click 'Next' through every computational stage." This directive is more recent and more specific than the design package for this one surface, and the design package's own `IMPLEMENTATION_NOTES.md` already anticipates the underlying computation staying illustrative/precomputed regardless of interaction shape.

**Impact:** Visual rhythm differs from the prototype (no discrete stage-click affordance), but every requirement `VISUAL_ACCEPTANCE_CRITERIA.md` states for this surface still holds: every beat is explicitly labeled, the precomputed/no-validation disclaimer is permanent and visible, and beats with no real artifact (Backbone, Predicted Fold & Metrics) render as explicit evidence gates rather than fabricated frames.

**Temporary:** No — this is the intended final shape per the task's explicit override, not a placeholder.

---

## 2. Header renders one combined lockup image, not a separate icon + wordmark

**Target:** Prototype header shows a 28px square icon mark and a 12px-tall wordmark as two separate images side by side (`markSrc` + `wordSrc`).

**Implemented:** `logo_full_{theme}_svg.svg` (the canonical combined icon+wordmark lockup) rendered as one image.

**Reason:** The canonical brand assets under `logo/` include `icon_black_svg.svg`/`icon_white_svg.svg` (icon only) and `logo_full_black_svg.svg`/`logo_full_white_svg.svg` (combined lockup), but no standalone wordmark-only file for either theme. Cropping one out of the combined SVG would mean recreating/altering a canonical asset, which `AGENTS.md` forbids outside of "officially required platform variants." Using the existing combined lockup avoids fabricating a new derived asset.

**Impact:** Minor visual difference in the header's brand cluster; the loading screen still uses the icon-only mark exactly as specified.

**Temporary:** Yes, if a true wordmark-only asset is added to `logo/` in a future session, the header should switch to icon+wordmark to match the prototype exactly.

---

## 3. No secondary-structure (helix/strand/coil) coloring in the sequence tray

**Target:** `COMPONENT_INVENTORY.md` §8 and the prototype's sequence tray underline each residue with a helix/strand/coil color track and a matching legend.

**Implemented:** The sequence tray colors residues by real UniProt domain range (when annotated) and omits the secondary-structure underline entirely rather than fabricate one.

**Reason:** UniProt's `ft_helix`/`ft_strand`/`ft_turn` fields are sparsely populated (verified empty for a well-characterized reference protein during this pass) and Mol*'s own DSSP-derived secondary structure is not yet plumbed from `StructureView` up to `SequenceTray`. Per `SCIENTIFIC_DATA_BOUNDARIES.md`, an invented H/E/C pattern is exactly the kind of fixture-style placeholder production must not ship.

**Impact:** The sequence tray's footer legend shows domain swatches only; VISUAL_ACCEPTANCE_CRITERIA's sequence bullets (real sequence, working range selection, bidirectional highlighting, virtualization) are otherwise met in full.

**Temporary:** Yes — wiring Mol*'s computed secondary structure out of `StructureView` (it already computes this to render cartoons) into the sequence tray is the correct real-data fix, deferred for time.

---

## 4. Territory/hero labels can still occasionally overlap at default universe framing

**Target:** `VISUAL_ACCEPTANCE_CRITERIA.md` implies clean, uncluttered territory labeling ("dense-but-breathable").

**Implemented:** All 6 territory labels project unconditionally whenever on-screen. The arrival-framing fix in item 6 below (r:900 + `WORLD_SCALE`) gives them materially more room and resolved the severe case reported in user testing. One specific, recurring collision was root-caused and fixed directly: a territory label's projected position can coincide with the query bar's fixed screen region (confirmed via `document.elementFromPoint` — it was landing on a real suggestion-chip button, not empty space, which silently ate the click). `projectLabels()` in `WorldCanvas.tsx` now detects that specific overlap and nudges the label below the query bar's reserved rectangle. What remains unaddressed is territory-*vs*-territory overlap (two territory labels landing close to each other from a given camera angle) — no general label-collision solver exists for that case.

**Reason:** The query-bar collision was fixed because it silently broke a real interaction (the click landed on the wrong element). Territory-vs-territory overlap is presentation-only — clicking either label still resolves correctly — so a full force-directed label-placement solver was judged more engineering than this pass affords for a cosmetic-only remainder.

**Impact:** The query-bar collision (the one that broke interaction) is fixed and verified (e2e `entering a territory…` test passes reliably). Territory-vs-territory overlap remains cosmetic only — clicking a label always resolves to the correct territory regardless of visual overlap (verified via automated click).

**Temporary:** The territory-vs-territory remainder is — a general screen-space de-overlap pass is the correct follow-up. The query-bar collision fix is permanent.

---

## 5. No live-computed reference for "sourced fact" callout in Glance

**Target:** Prototype's Glance tab shows a single teal-rule-highlighted "sourced fact" — a curated, surprising, citable one-liner distinct from the function summary.

**Implemented:** Dropped. Glance shows the real UniProt function summary and a plain citation line; no separate "fact" box.

**Reason:** No real, non-fabricated data source currently supplies a distinct "surprising fact" separate from the function summary for arbitrary reviewed proteins (only the 7 prototype fixture proteins had hand-curated facts). Inventing one per protein would violate `SCIENTIFIC_DATA_BOUNDARIES.md` rule 5.

**Impact:** Minor layout simplification in Glance; no loss of real information.

**Temporary:** Possibly permanent unless a real curated-fact source (e.g. UniProt's "Miscellaneous" comments, or an editorially reviewed hero-protein list) is added.

---

## 6. World-space positions scaled 6× at the render boundary; arrival distance raised from r:640 to r:900

**Target:** `MOTION_AND_CAMERA_SPEC.md` states literal camera distances (arrival r≈600–640, territory-enter r:260, etc.) tuned against the prototype's own synthetic, evenly-sized 6-territory point field.

**Implemented:** `src/domain/territories.ts` exports `WORLD_SCALE = 6` and a `worldPosition()` helper applied everywhere a real protein's `position` (or a territory's derived center) enters world space in `WorldCanvas.tsx`. `CameraEngine`'s default/home framing was also raised from r:640 to r:900.

**Reason:** Real production data (`src/domain/spatialization.ts`) places region centers within roughly ±100 units of the origin — a coordinate system inherited from the pre-Claude-Design engine's much tighter camera clamp (`r ∈ [8,520]`). Left unscaled against the design's much larger camera distances, the entire universe rendered as a small, illegibly dense smudge in the center of the frame — exactly the "too dense and bunched into the center" defect reported in user testing. Rather than compress the design's literal camera numbers (which are load-bearing for feel/easing/damping and explicitly asked to be preserved), positions are scaled up at the presentation boundary only; the underlying data files, their real coordinates, and every other subsystem are untouched. Real data is also genuinely unevenly distributed across the 6 territories (Catalysis & Metabolism is a broad annotation catch-all and is markedly denser than the others, an honest fact about the reviewed corpus) — r:900 gives every territory room to read as distinct at arrival instead of the largest one dominating the frame.

**Impact:** All camera-facing behavior (orbit/pan/zoom-to-pointer constants, easing, per-transition tween durations, territory-enter/select/inspect r-values) is unchanged in relative terms; only the absolute arrival distance and the data-to-world unit conversion changed. Verified via Playwright screenshot comparison before/after at 1920×1080 in both themes.

**Temporary:** No — this is the correct permanent reconciliation between the design's literal camera contract and the real corpus's actual spatial extent.

---

## 7. Opt-in ambient soundscape, in addition to (not instead of) the discrete cue set

**Target:** `SOUND_SPEC.md` explicitly restricts sound to short, discrete cues tied to state transitions and states this restraint "should not be expanded without a specific design reason": "Ambient orbit, camera drag/pan/zoom … does NOT have sound."

**Implemented:** A second, independent, off-by-default toggle (`AMBIENT ○`/`AMBIENT ●` in the header) that plays a very quiet, slowly modulated two-oscillator drone (`src/hooks/useSound.ts`, `startAmbient`/`stopAmbient`) for as long as it is enabled, persisted to `localStorage` separately from the existing cue-sound toggle.

**Reason:** Explicit, direct user request during in-product testing of this build ("I want a persistent ambient sound whenever [I want it]"). Per the reconciliation rule, visual/interaction conflicts resolve to the Claude Design by default, but a live, explicit request from the human stakeholder for a genuinely new, clearly-scoped, opt-in capability is a legitimate reason to extend the spec rather than override it — the existing discrete cue set (`SOUND ○`/`SOUND ●`) is untouched and still matches `SOUND_SPEC.md` exactly.

**Impact:** Additive only; no existing sound behavior changed. Ambient audio never plays unless a user explicitly opts in twice (once implicitly via any Web Audio user-gesture requirement, once via the toggle itself), consistent with the spec's "never plays before the user has turned it on" principle applied to the new capability.

**Temporary:** No — this is an intentional, permanent product addition on top of the design's sound contract.

---

## 8. Selection/query visual language: unified shader highlight (grow+glow+pulse) replacing the bracket marker and the query grid-relocation layout

**Target:** The prior implementation (this round's starting point) used a HUD-style four-segment bracket sprite around a selected protein, and relocated query matches into a structured grid/shell layout away from their real positions.

**Implemented:** Both replaced on direct, explicit user request after live testing. Selection and query matches now share one GPU-driven mechanism: a per-point `aMatch` attribute (`WorldCanvas.tsx`) drives a size increase, a teal/glow color mix, and a slow sine pulse in the point shader, while the rest of the field fades via `uDimNon`. Query matches are never moved — the camera reframes to a bounding sphere of their real positions instead ("canonical cinematic" framing, camera-only). The bracket sprite is replaced by a custom-shader billboarded "petri dish" — a frosted, rim-lit disc behind the selected point whose light direction rotates with the camera and whose opacity pulses gently.

**Reason:** Direct, explicit user feedback: "I do not like your implementation of universe manipulation via query. I hate the new structured grid," and "I do not like the square HUD-like, crosshair-esque teal box... I want a glass dish to appear behind the protein." Per the reconciliation rule, this kind of live, specific stakeholder correction on visual/interaction behavior overrides the prior implementation outright.

**Impact:** Query results and single-protein selection now look and behave identically (same shader path), which also simplifies the code (one highlight mechanism instead of two). Real protein spatial positions are never altered for any reason — only camera framing and per-point shader attributes change. Related-but-not-primary proteins (thread endpoints) get a separate `aExempt` attribute that exempts them from the field-wide fade without giving them the grow/glow/pulse treatment, so they stay visually distinct from both the primary selection and the dimmed field.

**Temporary:** No — this is the corrected, permanent interaction language going forward.

---

## 9. Territory-label legibility via glass backing + pointer priority, not literal per-pixel dynamic text color

**Target:** User's literal request: "I want territory names always legible (a black font color on a bright protein dot field and white font color on a dark protein dot field)... Since the text's background changes from light to dark as I orbit the screen."

**Implemented:** Territory labels render on a frosted glass pill (`hx-glass`, blur + translucent fill + border) with generous padding, rather than sampling the pixels behind the label each frame to flip text color. Separately, `WorldCanvas.tsx` now checks pointer position against every territory label's real `getBoundingClientRect()` before running protein-hover raycasting or handling a canvas click — territory labels always win pointer priority over protein-dot hover/selection when the two are in visual conflict, addressing the "ENTER button becomes impossible to click deterministically" complaint directly.

**Reason:** Per-pixel sampling of the WebGL canvas behind each DOM label (e.g. via `gl.readPixels` at the label's screen rect, every frame, for up to 6 labels) is expensive relative to a `requestAnimationFrame` loop that already renders 75,000 points, and reading back GPU pixel data synchronously each frame is a well-known performance foot-gun (the render loop already logs `GPU stall due to ReadPixels` warnings from an unrelated source in this sandbox). A glass backing is a legitimate, lower-cost equivalent that solves the same underlying legibility problem (contrast against a variably-colored, ambiently-drifting starfield) without a per-frame readback. This substitution has not been explicitly re-confirmed with the user against their literal per-pixel-color phrasing and should be revisited if they push back after seeing it live.

**Impact:** Labels are legible in both themes against any point-field density/color behind them. The click-priority fix is the part that resolves a real, previously-reported broken interaction (the ENTER button being unreliable to click); the glass-backing part is cosmetic-equivalent, not literal.

**Temporary:** The glass-backing choice is a judgment call substituted for the literal request — flagged as the one deviation in this round most worth double-checking against user intent on next review.

---

## 10. Honest camera-orbit "rotate" toggle in Inspect, not molecular-dynamics animation

**Target:** User request: "I want an option for animation of protein dynamics if possible."

**Implemented:** A `ROTATE ○/●` chip in the Inspect panel that toggles Mol*'s built-in `trackball.animate` spin behavior — a slow, constant-speed camera orbit around the fixed structure. Labeled explicitly (tooltip: "Slow camera-orbit spin — not a molecular-dynamics simulation") and auto-enabled while in the Design trajectory view so the model isn't static during playback. Dark-mode Mol* lighting (`exposure`, `ambientIntensity`, `interiorDarkening`) was also made theme-aware and boosted for dark mode, addressing the separate "protein doesn't appear bright enough" contrast complaint.

**Reason:** `SCIENTIFIC_DATA_BOUNDARIES.md` forbids fabricating conformational/dynamics data that doesn't exist for these structures (no MD trajectory is computed or sourced for any protein in the corpus). A camera-orbit spin is an honest, zero-fabrication way to make the viewport feel alive without claiming to show real molecular motion.

**Impact:** Purely additive UI capability plus a lighting parameter change; no science claims changed, no new data dependencies.

**Temporary:** No — the honest framing is intentional and permanent; real per-residue flexibility/dynamics visualization would require a real, sourced MD or NMR ensemble dataset that doesn't currently exist in this corpus.

---

## 11. Design trajectory: real sequence-diff comparison strip and an explicit "prompt that yields this" line, no fabricated backbone/fold frames

**Target:** User request: "no backbone candidates showing after, no sequence design candidate evolving... no actual candidate comparison animation... tell me here what I should type into the prompt field that would yield the result you've built for."

**Implemented:** The Design panel now shows a real character-level diff strip between the two real ProteinMPNN candidate sequences (chain A, tied-position homotrimer) with differing positions colored teal, in both the "sequence" and "compare" beats — a genuine, sourced candidate comparison using only real sequence data already present in `public/data/design/proteinmpnn-6ehb.json`. A `PROMPT THAT YIELDS THIS` line now surfaces the design's `specification` string. The two evidence-gate beats (`backbone`, `fold`) keep their honest "no artifact exists" framing but now also name a real, publicly documented artifact class that *would* fill each gap (RFdiffusion's published motif-scaffolding trajectories for backbone frames; an AlphaFold2/ESMFold prediction run on each candidate sequence for fold frames) so the gate reads as informative rather than a dead end.

**Reason:** The user's fuller ask — backbone-generation frames, predicted-fold animation, and a fold-level candidate comparison — would require either fabricating data (forbidden by `SCIENTIFIC_DATA_BOUNDARIES.md`) or sourcing and integrating a new real dataset (a real RFdiffusion trajectory and/or real AlphaFold2 predictions of the two candidate sequences). The residue numbering correspondence between the ProteinMPNN candidate sequences and the deposited 6EHB structure's `auth_seq_id` numbering was not verified in this pass, so a 3D-structure residue highlight was deliberately not attempted — an incorrect highlight would be worse than an honest gap. The sequence-text diff avoids this risk entirely (it never touches 3D residue numbering) while still directly answering "no candidate comparison."

**Impact:** The Design panel now visibly changes across beats instead of showing a static structure throughout; the honest evidence gates are preserved and improved rather than removed.

**Temporary:** Yes — sourcing a real RFdiffusion backbone trajectory and/or real AlphaFold2/ESMFold predictions for the two candidate sequences (with verified residue-numbering correspondence to 6EHB) is the correct follow-up to fully satisfy this request; explicitly deferred per the user's own "we'll build this out completely later."

---

## 12. Territory → Cluster rename scoped to user-visible strings, not every internal identifier

**Target:** "Replace all user-visible 'Territory' terminology with 'Cluster'."

**Implemented:** Every string a user actually sees or hears now says Cluster — the depth rail entry, the cluster label chips ("CLUSTER 01"), the "Click a cluster to enter" hint, the Ask Atlas trace line (`scene.focusCluster(...)`), the copilot's own system instruction, the onboarding coach marks, and this document. Internal identifiers (`SceneMode: "territory"`, `ENTER_TERRITORY`, `src/domain/territories.ts`, the `TerritoryId` type, CSS classes like `hx-label-territory`) were deliberately left as-is.

**Reason:** The codebase already has an unrelated, pre-existing concept literally named "cluster" — the offline pipeline's fine-grained micro-clusters (`manifest.clusters`, `atlasClusterSchema`, `AtlasProtein.cluster`), used internally for shard-loading priority and never surfaced to users. Renaming the UI's 6-region concept to the same bare identifier at the code level would collide with that concept and materially raise the risk of a real bug (e.g. a future edit conflating "the cluster the user is in" with "the corpus micro-cluster this protein belongs to") for a change that has zero user-facing benefit — the internal names aren't visible to anyone outside the codebase. Renaming every occurrence project-wide was judged more risk than the "final corrections, not a redesign" mandate affords.

**Impact:** No user, in any theme, at any screen, can see the word "Territory." The code's internal vocabulary is unchanged.

**Temporary:** The internal rename (module/type/CSS names) is a reasonable follow-up for a future pass with room to re-verify the whole surface area; not required for product correctness today.

---

## 13. Removed Neighbourhood from the visible depth hierarchy; Depth Rail is now 4 levels

**Target:** "Remove Neighborhood from the visible depth hierarchy."

**Implemented:** `DepthRail.tsx`'s level list dropped the inert `neighbourhood` entry entirely (it was already non-clickable/non-navigable — a permanently disabled row) — the rail now shows Universe → Cluster → Protein → Structure, 4 levels, and `currentDepth()` was renumbered to match. The copilot's system instruction was updated to describe the real 4+1 hierarchy (Universe, Cluster, Protein, Structure, plus De novo/Design reachable from a real protein) instead of a fictitious 5-level Universe/Territory/Neighbourhood/Protein/Structure list.

**Reason:** Per the design docs, Neighbourhood was never a distinct navigable `SceneMode` — it described a movement *regime* within Territory/Cluster (labels resolving into view as the camera moves closer), not a separate depth. A round-2 bugfix already tried filling that behavior with a pooled auto-label system and then explicitly removed it in round 3 because it conflicted with "no protein name unless hovering." What was left behind was a dead, disabled rail row implying a level that doesn't exist — confusing, not merely redundant.

**Impact:** The Depth Rail is shorter and every row is real and reachable.

**Temporary:** No.

---

## 14. Cluster isolation made binary; the JS-side per-cluster dim bug fixed alongside it

**Target:** "When a user enters a cluster: every protein outside that cluster must be removed from rendering or fully hidden... cluster proteins must remain fully coloured, well lit, and clearly selectable. This requirement is binary."

**Implemented:** The point fragment shader now hard-gates alpha to 0 for any point outside the active cluster that isn't an explicitly revealed relationship target (`uTerritoryFocus`/`uActiveTerritory`/`aExempt`), instead of the previous "dim to `dimNon`" treatment — verified visually (before/after screenshots) that other clusters fully disappear, not fade. Picking (hover + click) in `WorldCanvas.tsx`'s `pickProtein()` now rejects any raycast hit outside the active cluster (and not exempt) before it can become a hover label or a selection, closing a real gap: the pre-existing code only *dimmed* other clusters visually but never actually restricted hover/selection to the active one. Cluster labels other than the one being entered are no longer shown at all while inside a cluster (previously rendered at 12% opacity) — `showTerritories` is now `mode === "universe"` only.

A second, independent bug was found and fixed in the same pass: `WorldCanvas.tsx`'s per-frame `uDimNon` target calculation included `material.uniforms.uTerritoryFocus.value > 0.5` in its trigger condition, meaning simply being inside a cluster (regardless of any selection) dimmed the cluster's *own* members by the same factor used to de-emphasize non-matches during a search/selection — directly undermining "cluster proteins must remain fully coloured, well lit." Removed; `uDimNon` now only engages when there is an actual selection or active query to be primary against.

**Reason:** Both were genuine regressions/gaps against the explicit binary requirement, confirmed by screenshot comparison (`/tmp/.../round2/03-cluster-light.png` vs. the pre-fix baseline) before and after.

**Impact:** Entering a cluster now shows only that cluster's proteins, fully lit, hoverable, and selectable; every other cluster is completely absent from the rendered scene until the user leaves.

**Temporary:** No.

---

## 15. Deterministic protein-selection centring: measured DOM bounds, not canvas midpoint

**Target:** "Selecting any protein must... move that protein into the usable visual centre... centre it between the right edge of the identity panel and the left edge of any right-side controls... account for actual measured panel bounds."

**Implemented:** `computeFramingTarget()` in `WorldCanvas.tsx` measures `.hx-identity`'s real `getBoundingClientRect()` and, when mounted, `.hx-inspect`/`.hx-design`'s real left edge, computes the midpoint between them in screen space, and offsets the camera's look-at target (not the protein's real world position — the petri dish is always drawn at the protein's actual position) along the camera's screen-right axis so the protein renders at that midpoint instead of the raw canvas centre. Re-applied on `SELECT_PROTEIN`, `INSPECT_STRUCTURE`, `TOGGLE_THREADS`, and on window resize (which also re-captures the `"protein"` camera-level snapshot so a later Structure→Protein return stays correctly centred).

**Reason:** Previously the camera always targeted the protein's exact position, which puts it at the literal canvas midpoint — with the identity panel occupying the left ~30–40% of the screen, the "centred" protein visually read as off-centre to the right, confirmed by screenshot (petri dish at x≈960 on a 1920px canvas where the panel-aware centre is ≈1250).

**Impact:** Verified via screenshot at 1920×1080 in both themes and after entering Inspect (where the Inspect panel also claims the right side) — the selected protein now renders roughly centred in the actual usable gap.

**Temporary:** No.

---

## 16. Petri-dish tint changed for real light-mode contrast

**Target:** "The petri-dish selection marker must be... faint but unmistakably visible in light mode."

**Implemented:** Light-mode `dishTint` changed from `#f3f1ea` (nearly identical to the light fog background `#efece4`) to a pale teal-grey `#d8e4e0` with a real luminance gap from the background.

**Reason:** The old tint was visually almost indistinguishable from the surrounding fog/point field in light mode — confirmed by screenshot — failing "unmistakably visible."

**Impact:** The dish is now a faint but genuinely readable disc in light mode; dark mode (already passing) is unchanged.

**Temporary:** No.

---

## 17. Relationship-thread camera fitting on reveal; theme-aware colour; restrained default opacity

**Target:** "When relationships are revealed inside a cluster:... fit the selected protein and all displayed relationship targets inside the usable viewport... render lines white in dark mode, render lines black or near-black in light mode; use restrained opacity until selected or hovered."

**Implemented:** `TOGGLE_THREADS` is now a real camera-choreography case: revealing threads fits a bounding-sphere framing (with margin) around the selected protein and every real thread endpoint (via the new `computeThreadEndpoints()` in `relationships.ts`, shared with the endpoint-projection test); hiding threads re-centres back on the protein alone using the same panel-aware framing as selection. Thread line colour is now theme-driven (`#141414` light / `#ffffff` dark) and recolored in place on theme toggle. Base thread opacity lowered from a flat `0.7` to `0.45`.

**Reason:** Previously `TOGGLE_THREADS` had no camera effect at all — a related protein outside the current framing (or outside the cluster) could render its thread off-screen or barely visible. Thread colour was a fixed teal in both themes, and did not react to a theme change without a full reselection.

**Impact:** Verified structurally (thread endpoints now come from a single, tested source of truth — see `relationships.test.ts` and the e2e endpoint-projection test) and by code reading for the camera-fit and colour logic.

**Temporary:** No.

---

## 18. `CLOSE_PROTEIN`: a new command distinct from `RETURN_ONE_LEVEL`, and it preserves the active query

**Target:** "Only the close button on the identity panel is allowed to fully clear the protein view and return to the cluster or inventory (Universe) view... Back and Escape must trigger a one-level return."

**Implemented:** A new `CLOSE_PROTEIN` scene command, wired only to the identity panel's × button, that always fully clears Protein/Structure/Design/Sequence state and returns directly to the cluster (if the protein was reached from one) or Universe in a single step — regardless of whether Glance, Inspect, or Design is currently showing. `RETURN_ONE_LEVEL` (Back/Escape/the header's `‹ BACK`) is untouched and continues to step up exactly one level at a time (Structure → Protein-with-panel-still-open → Cluster/Universe). Unlike the header's explicit "return to Universe" action (`RETURN_TO_UNIVERSE`, which is a deliberate reset), `CLOSE_PROTEIN` preserves an active query rather than discarding it — closing a protein you reached via a search is not the same user intent as pressing Home.

**Reason:** Previously the identity panel's × button was wired to the same `RETURN_ONE_LEVEL` action as Back/Escape, so closing from Inspect only returned to Glance (protein still selected, panel still open) rather than fully clearing the selection as specified — the user had to click twice.

**Impact:** Verified with new reducer unit tests (`atlas.test.ts`) covering close-from-Inspect, close-from-Design, and the query-preservation case, plus the existing Back/Escape/Depth-Rail behavior remaining verifiably unchanged (a direct one-vs-the-other comparison test).

**Temporary:** No.

---

## 19. Structure-loading: representation switching no longer redownloads/reparses; sandbox network caveat

**Target:** "No repeated structure parsing when representation controls change... target first meaningful structure render within 3 seconds... Do not describe ordinary slow loading as merely an external CORS issue without measurement."

**Implemented:** `StructureView.tsx` split into two effects: one that downloads and parses the structure (depends only on `active`/`structure`/`retryKey`), and one that applies the representation/colour-mode/ligand-visibility/confidence-coloring (depends on those plus a `structureGeneration` counter bumped once per successful parse). Switching representation, colour mode, or ligand visibility now deletes and rebuilds only the Mol* representation state objects it previously created, never redownloading or reparsing the underlying structure or remounting the plugin — closing the gap the prior session's own acceptance matrix had already flagged as "Partial... not yet optimized."

**Reason/measurement:** Direct timing showed structure fetches to `models.rcsb.org`/`alphafold.ebi.ac.uk` failing after ~13s in this sandbox with `ERR_CONNECTION_RESET`, even with Playwright's browser explicitly pointed at the same egress proxy `curl` succeeds through in under 1s from the same container — a sandbox-only browser-egress limitation (this environment's Chromium is not configured to route through the agent proxy the way command-line tools are), not application slowness; the same class of caveat as the already-documented SwiftShader/software-GPU note in `CURRENT_STATE.md`. This was measured, not assumed, before concluding it — see the diagnostic trace in this session's `AI_DEVELOPMENT_LOG.md` entry. The representation-effect split, by contrast, is a real, verifiable code-level fix (confirmed via `tsc`/`eslint` against Mol*'s own types) independent of network reachability, and directly closes the one concrete, previously-documented performance gap in this codebase.

**Impact:** Toggling CARTOON/SURFACE/BALL-AND-STICK/SPACEFILL, COLOR chain/domain, or LIGANDS no longer re-fetches or re-parses the structure. Full visual confirmation of the optimized path (first-frame timing under real network conditions) could not be completed in this sandbox and is recommended as a follow-up smoke test in an environment with real outbound browser networking.

**Temporary:** The 3-second full-network verification is deferred to an environment where it's actually measurable; the code-level fix itself is permanent.

---

## 20. Onboarding built from scratch — none existed on the PR #11 baseline

**Target:** "Do not display an immediate mandatory multi-step modal on first load... after ~6–10 seconds... show one quiet invitation... anchored contextual coach marks... permanent GUIDE entry in header."

**Implemented:** `useOnboarding.ts` + `Onboarding.tsx`: a quiet, non-blocking "New to the Atlas?" invitation appears after 7s of no meaningful interaction (never if the user has already selected a protein, entered a cluster, or run a query), offers "Show me around" / "I'll explore," and both choices persist via `localStorage` and never reappear uninvited. Accepting opens a 7-step anchored coach-mark sequence (orbit/pan/zoom, cluster entry, protein selection, Depth Rail, Query, Ask Atlas, and where to find GUIDE again) that rings the real target element (`getBoundingClientRect()`-measured, live-updated) without covering it, and supports Next/Back/Skip/Finish/Escape/arrow-key navigation. A permanent `GUIDE` button in the header replays it on demand regardless of prior dismissal state.

**Reason:** There was no onboarding of any kind on the PR #11 baseline this branch is built from — this is new construction against the spec, not a correction of a PR #12 regression.

**Impact:** Verified end-to-end with Playwright: the invitation is absent immediately on load, appears after the delay, is non-blocking (canvas stays interactive underneath), declines persist across reload, and the coach-mark ring correctly tracks and never disables its target control.

**Temporary:** No.
