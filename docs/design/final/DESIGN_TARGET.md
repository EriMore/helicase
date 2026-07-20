# Design Target

## Direction: "The Illuminated Plate"

The protein universe rendered as a luminous scientific plate — ink specimens on warm paper — not a dark field with neon accents. **Light mode is the flagship.** Dark mode ("Specimen Chamber") is equally authored, not a mechanical inversion.

**Teal is a rare semantic signal, never decoration.** It marks: current location (depth rail), active selection (bracket marker), interactive focus (buttons/borders in an active state), and the design-trajectory accent. If removing teal from a screen makes it unreadable or ambiguous, that screen has failed the system. Teal must never be the dominant color of any view.

The logo is static. It never rotates, spins, or otherwise animates as a loading indicator or decoration. Canonical assets only, one per theme (`prototype/assets/`).

## What "done" means

The prototype in this package **is** the design target — pixel, motion, and copy fidelity, not a sketch to reinterpret. Production should feel identical to a user who has used the prototype, with:

- the real 575,503-protein indexed corpus browsable, with a 75,000-protein delivery profile actually rendered in the universe view (not the prototype's ~13,400-point fixture field)
- real UniProt-sourced identity, sequence, and provenance data (not the 7 illustrative fixture proteins)
- the real Mol* renderer mounted at the structure-inspection viewport (not the stylized backbone stand-in)
- a real relationship graph from annotations/databases/computed similarity (not the fixture thread list)
- GPT-5.6 behind Ask Atlas with real scene-control tool calls (the trace mechanism and constraints are unchanged)
- real or explicitly precomputed protein-design trajectories (the prototype's journey is illustrative choreography, not real computation — see `SCIENTIFIC_DATA_BOUNDARIES.md`)

## Non-goals

- Do not add a persistent chatbot sidebar. Ask Atlas is summonable (⌘K) and dismisses itself.
- Do not add loading spinners, progress sparkle, or fake percentage bars anywhere — especially not on the logo or the design journey.
- Do not turn Query (deterministic filter) and Ask Atlas (semantic assistant) into one control. They are deliberately separate.
- Do not visually connect every protein to every other protein. Relationship threads are curated (≤3 shown), subordinate, and off by default.
- Do not brighten or expand teal's role to "the brand color everywhere." It stays a signal.
- Do not simplify the 5-level spatial hierarchy (Universe → Territory → Neighbourhood → Protein → Structure) or the exact camera-restore behavior of the Depth Rail — this is the primary navigation instrument, not a breadcrumb.

## Source of truth precedence

If any document in this package conflicts with `prototype/Helicase Atlas.dc.html`, **the prototype source wins.** The Markdown docs describe it; they do not supersede it. Where the prototype itself is ambiguous or under-specified for a state production must support (e.g. exact real-corpus LOD strategy), `IMPLEMENTATION_NOTES.md` states that explicitly as an open decision — it is not silently resolved by any other document.
