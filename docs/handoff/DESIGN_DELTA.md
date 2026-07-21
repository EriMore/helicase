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
