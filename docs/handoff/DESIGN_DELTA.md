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

**Implemented:** All 6 territory labels project unconditionally whenever on-screen. The arrival-framing fix in item 6 below (r:900 + `WORLD_SCALE`) gives them materially more room and resolved the severe case reported in user testing, but no screen-space de-overlap pass exists, so labels can still touch when two territory centers happen to align closely from a given camera angle.

**Reason:** Time-boxed for this pass; a proper fix (screen-space label-collision resolution, à la force-directed label placement) is more engineering than this pass affords.

**Impact:** Cosmetic only — clicking a label always resolves to the correct territory regardless of visual overlap (verified via automated click).

**Temporary:** Yes — a screen-space de-overlap pass is the correct follow-up.

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
