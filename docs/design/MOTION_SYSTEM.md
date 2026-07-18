# Motion System

## Motion is semantic

Animation communicates a change in scale, confidence, intention, causality, or state. No motion exists only to make the interface feel busy.

## Core primitives

| Primitive | Meaning | Behaviour |
|---|---|---|
| `drift` | Living space | Near-imperceptible idle motion; pauses under interaction. |
| `dive` | Change of scale | Camera follows a selected star into structure with a clear midpoint. |
| `surface` | Regain orientation | Structure recedes into its source region. |
| `focus` | Directed attention | Residues or domains pull light and camera, without hiding context. |
| `morph` | Comparison | Two structures align through a visible correspondence, not a hard swap. |
| `reveal-confidence` | Trust boundary | Solid core persists while uncertain regions dissolve into fog. |
| `denoise` | Generation | Ordered playback from noise to fold; pipeline stages are explicit. |
| `wobble` | Uncertainty | Low-confidence regions move probabilistically, never chaotically. |
| `settle` | Understanding | Motion resolves into a still, inspectable state. |

## Timing

Fast feedback acknowledges intent within 120–180ms. Camera travel uses a longer ease with a readable destination. The confidence reveal and design denoise are deliberate acts: they may take seconds, but every interval must carry information.

## Interruption

Every long transition can be paused, skipped to its resolved state, or reversed. Reduced-motion mode replaces camera travel with crossfades and preserves state changes.

## Motion review

For every animation ask: what changed, why did it move, what should the user notice, and can the user still orient themselves?
