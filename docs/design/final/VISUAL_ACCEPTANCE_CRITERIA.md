# Visual Acceptance Criteria

Production implementation must pass every item below before it can be considered a faithful realization of this design target. This is the checklist to run the finished build against — not a spec of *how* to build it (see `UI_INTEGRATION_HANDOFF.md` and `IMPLEMENTATION_NOTES.md` for that).

## Brand & logo
- [ ] Logo renders exactly once per screen context (header, loading) — no duplicate marks.
- [ ] Correct canonical asset per theme (`helicase-mark-black.png`/`word-black.png` in light, `-white` variants in dark) — no recoloring via CSS filters.
- [ ] Logo **never** rotates, spins, or pulses at any point, including loading.

## Color discipline
- [ ] Light mode is the primary/flagship presentation; dark mode is equally polished, not a CSS-filter inversion.
- [ ] Teal appears only as a signal: current depth-rail level, active selection/marker, active toggle/tab state, active button borders, design-trajectory accent. It is never a background fill, never decorative, never more than a small minority of any screen's color weight.
- [ ] Territory palette (6 distinct hues) and evidence/confidence/thread-type colors match `DESIGN_TOKENS.md` exactly.

## Navigation & camera
- [ ] Orbit (left-drag), pan (right/middle/shift-drag), zoom-toward-pointer (wheel, ctrl+wheel = fine), and double-click focus all work and match the constants in `MOTION_AND_CAMERA_SPEC.md`.
- [ ] Ambient orbit runs only in Universe/Territory, pauses instantly on any input, resumes after exactly the specified idle window.
- [ ] Every Depth Rail level above the current one is clickable and restores the **exact** prior camera framing (not an approximation or a generic re-frame).
- [ ] `Esc` returns exactly one level; the home/logo click returns fully to Universe.

## Density & scale honesty
- [ ] The universe view visibly implies thousands of points per territory (dense-but-breathable — negative space keeps territories legible as distinct forms).
- [ ] UI copy honestly represents the real scale: delivery profile (75,000) and full indexed corpus (575,503) are both stated, never conflated.
- [ ] No territory or cluster reads as a flat, sparse placeholder field.

## Identity & disclosure
- [ ] Glance / Learn / Inspect(structure) three-tier disclosure is present and in that order of increasing depth.
- [ ] Every claim shown (function summary, sourced fact, pathway, disease association, etc.) is traceable to a citation/source line — nothing reads as invented filler.
- [ ] Unknown fields are shown as explicitly unknown, never silently omitted in a way that implies completeness, nor backfilled with placeholder prose.

## Sequence
- [ ] Real one-letter amino-acid sequences render correctly for sourced proteins, at readable scale, with working residue-range selection.
- [ ] Selecting a residue range highlights the corresponding region in the 3D structure and vice versa (bidirectional).
- [ ] Very large proteins (titin-scale, tens of thousands of residues) use a virtualized/domain-overview presentation, never a single unbroken line that would be unusable.

## Relationship threads
- [ ] At most a handful (≤3) of curated relationship threads shown per protein, off by default, explicitly revealed by the user.
- [ ] Each thread states its type, strength/status, source, and a one-line basis — no bare unlabeled lines.
- [ ] Threads are visually subordinate to the proteins/points they connect — thin, non-dominant, never a dense web.

## Structure & confidence
- [ ] Representation switching (Cartoon/Surface/Ball & Stick/Spacefill) works and updates the viewport without a full reload of the panel.
- [ ] Confidence X-Ray is offered **only** for predicted structures; experimental structures show method + resolution instead and never a confidence UI.
- [ ] Confidence coloring, when shown, uses the defined 4-stop low→high gradient and a visible legend.

## Protein design journey
- [ ] The journey is staged and explicitly labeled at every stage (never a bare unlabeled spinner or bar).
- [ ] Every design screen carries a visible, unambiguous "precomputed / not live computation / no experimental validation" disclaimer — this must survive into production regardless of how much of the pipeline becomes real.
- [ ] No fake progress bars, shimmer, or sparkle effects anywhere in the journey.

## Query vs. Ask Atlas
- [ ] The deterministic Query bar and the semantic Ask Atlas are visually and behaviorally distinct — different entry points, different response shape (count+filter vs. prose+trace).
- [ ] Ask Atlas shows a visible action trace for every scene-affecting answer; it never silently moves the camera or filters data without one.
- [ ] Ask Atlas is summonable and dismissible — never present as a permanently-docked sidebar.

## Accessibility & robustness
- [ ] All interactive elements (buttons, rail levels, tabs) have visible focus states and are keyboard-reachable.
- [ ] Reduced-motion setting disables ambient drift and snaps all camera tweens instantly, without breaking any state transition.
- [ ] Text remains legible over the point field at any camera angle — verify with a dense cluster directly behind each persistent panel.
- [ ] No critical control has a hit target or contrast level that fails ordinary usability scrutiny.

## Light + dark parity
- [ ] Every state in `SCREEN_STATE_MATRIX.md` has been visually checked in **both** themes, not just light.
