# Implementation Notes

Practical guidance for the engineering pass. Nothing here overrides `UI_INTEGRATION_HANDOFF.md` or the prototype source — this is "how you'll likely need to adapt it," flagged so decisions are made deliberately rather than by accident.

## Data substitution

- Replace the 7-entry `HEROES` fixture array with the real UniProt-backed protein records, streamed/paginated as needed — the per-protein data contract in `UI_INTEGRATION_HANDOFF.md` §7 is the shape to target.
- Replace the procedural point-field generator (`base`/`fam`/halo buffers, ~13,400 points) with the real 75,000-protein delivery profile. The visual system (distance-scaled point size, fog-fade LOD, family/halo distinction, additive blending in dark mode) is designed to scale — but GPU picking and frustum culling will need to be added for full-corpus interaction performance; the prototype's brute-force raycast-against-all-points approach (`nearHero`, `intersectObject`) will not scale to tens of thousands of points without acceleration.
- Replace the fixture relationship-thread generator with a real query against annotations/databases/computed similarity. Preserve the ≤3-thread, off-by-default, fully-attributed presentation exactly.
- Replace the seeded-random domain/secondary-structure generator (`decorate()`, `ssFor()`) with real UniProt feature records where available; where a real record doesn't exist for a given protein, show the field as unknown rather than generating placeholder domains.

## Structure rendering (Mol*)

- The prototype's `buildStructure()` builds a stylized three.js stand-in (tube/instanced-spheres/instanced-cylinders) from seeded fixture coordinates — this defines *representation semantics* (what Cartoon/Surface/Ball&Stick/Spacefill mean, how ligands and confidence coloring are layered) but is not real geometry.
- Mount real Mol* at the same viewport position (anchored to the marker/camera target used by `onInspect()`). Wire representation/color-mode/ligand-visibility controls to Mol*'s own API rather than rebuilding meshes manually.
- Resolve structures via `pdbId` (experimental) or `AF-<accession>-F1` (AlphaFold predicted) exactly as the evidence-gating logic expects — the experimental/predicted distinction is load-bearing for the Confidence X-Ray gate, not cosmetic.
- Real pLDDT coloring replaces the seeded-random gradient in `plddtColors()`; keep the same 4-stop palette and legend.

## Ask Atlas / GPT integration

- `askAtlas()` in the prototype is keyword-matched, not an LLM call — replace with real GPT-5.6 tool-calling against the SceneController's action surface (`scene.select`, `scene.filter`, `scene.focusTerritory`, `scene.revealThreads`, `scene.startDesign`, etc.).
- Preserve the **visible action trace** requirement exactly — every scene-affecting answer must show what it did, in the same terse `▸ scene.method(...)` notation, so the assistant's actions stay legible and undoable.
- GPT should explain, traverse, and compare using the *real* relationship graph — it must not be allowed to invent edges or relationships not backed by data.

## Protein-design trajectory

- Preserve the interface exactly (9 labeled stages, prose per stage, metrics table, 2-candidate compare, permanent disclaimer) regardless of whether the underlying computation becomes a real precomputed batch pipeline (e.g. real RFdiffusion/ProteinMPNN/AlphaFold2 runs) or stays illustrative for a first release — this is an explicit product requirement (see `SCIENTIFIC_DATA_BOUNDARIES.md`), not a placeholder to quietly drop.
- If real trajectory data is genuinely precomputed offline, the interface must still say so — never imply live computation is happening in the browser.

## Camera

- The spherical camera model, its damping, its clamps (r 40–1700, phi 0.14–3.0), and every tween duration/easing in `MOTION_AND_CAMERA_SPEC.md` are the contract. If production adopts a library (`camera-controls`, Drei `CameraControls`), configure it to match these constants rather than accepting its defaults — the "weighty and accurate" feel the design brief called for depends on these specific numbers, especially the easeInOutCubic curve and the zoom-toward-pointer lerp behavior.
- Keep the exact-snapshot-restore mechanism (`snap()`/`applySnap()`/`levelCam{}`) as a first-class concept — it is the Depth Rail's entire reason for existing as a spatial (not just hierarchical) back-navigation tool.

## State & persistence gaps to close

- **Theme and sound preference are not persisted** in the prototype (no `localStorage`) — add persistence in production so returning users keep their choice.
- **Reduced motion** is read from a prop (`this.props.reduceMotion`) rather than `prefers-reduced-motion` directly — wire this to the real media query (and allow an explicit in-app override if the product wants one).

## Fonts & third-party scripts

- Spectral + IBM Plex Mono currently load from Google Fonts at runtime; three.js r150.1 loads from unpkg. Production should self-host or pin these through the normal asset pipeline rather than depending on public CDNs at runtime.

## What to leave alone

Anything not called out above — panel positions, glass treatment, spacing, copy voice, the Glance/Learn/Inspect disclosure order, the territory palette, the sound cue set, the confidence gating rule — should transfer unchanged. When in doubt, the prototype source is the tie-breaker (see `DESIGN_TARGET.md` §"Source of truth precedence").
