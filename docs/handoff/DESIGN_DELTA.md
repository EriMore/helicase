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

## 4. Territory/hero labels can visually overlap at default universe framing

**Target:** `VISUAL_ACCEPTANCE_CRITERIA.md` implies clean, uncluttered territory labeling ("dense-but-breathable").

**Implemented:** All 6 territory labels project unconditionally whenever on-screen; at the default arrival framing their screen-space positions can overlap since several territory centers are close together from that angle.

**Reason:** Time-boxed for this pass; the prototype only ever shows 6 fixture territories at a fixed, hand-tuned camera start, while production's territory centers are derived from the real annotation-region layout (`src/domain/spatialization.ts`), which was not re-tuned for label spacing.

**Impact:** Cosmetic only — clicking through the overlap still resolves to the correct territory (verified via automated click).

**Temporary:** Yes — either a screen-space de-overlap pass or a re-tuned initial camera angle should fix this in a follow-up session.

---

## 5. No live-computed reference for "sourced fact" callout in Glance

**Target:** Prototype's Glance tab shows a single teal-rule-highlighted "sourced fact" — a curated, surprising, citable one-liner distinct from the function summary.

**Implemented:** Dropped. Glance shows the real UniProt function summary and a plain citation line; no separate "fact" box.

**Reason:** No real, non-fabricated data source currently supplies a distinct "surprising fact" separate from the function summary for arbitrary reviewed proteins (only the 7 prototype fixture proteins had hand-curated facts). Inventing one per protein would violate `SCIENTIFIC_DATA_BOUNDARIES.md` rule 5.

**Impact:** Minor layout simplification in Glance; no loss of real information.

**Temporary:** Possibly permanent unless a real curated-fact source (e.g. UniProt's "Miscellaneous" comments, or an editorially reviewed hero-protein list) is added.
