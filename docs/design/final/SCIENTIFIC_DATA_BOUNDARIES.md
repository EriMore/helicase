# Scientific & Data Boundaries — read before touching any data path

This prototype contains **illustrative protein data and geometry only.** It exists to specify interaction and visual design, not to serve as a scientific source. This document draws the line explicitly so nothing fixture-only is mistaken for production-ready.

## What is real in the prototype

- The **amino-acid sequences** for three proteins are the real UniProt one-letter sequences: hemoglobin subunit alpha / P69905 (141 residues), insulin / P01308 (51 residues after processing), GFP / P42212 (238 residues). These were used to make the sequence viewer's typography, wrapping, and selection behavior true-to-scale.
- Residue counts, organism names, gene symbols, and general biological framing for the 7 fixture proteins (hemoglobin-α, insulin, GFP, rhodopsin, titin, and two others incl. dnt1) are drawn from public reference knowledge and are directionally accurate, but **have not been re-verified against a live UniProt pull** and must not be treated as the authoritative record.
- The distinction between **experimental** (PDB, method + resolution shown) and **predicted** (AlphaFold, pLDDT shown) evidence types, and the rule that confidence coloring is only ever shown for predicted structures, is a real scientific constraint the interface enforces — this behavior is the part that's real, even though the specific pLDDT values are illustrative.

## What is illustrative / fixture-only — do not carry into production as data

- **The 7 `HEROES` fixture proteins** are the entire dataset the prototype ships. Production has 575,503 indexed proteins and a 75,000-protein delivery profile; the prototype represents this honestly via UI copy ("Resolved N of 575,503 reviewed") but does not attempt to render more than a stylized fixture field.
- **The point field itself** (~13,400 GPU points: 6 families × 1,700 + 3,200 halo) is procedurally generated placement, not real embedding coordinates, real taxonomy, or real family sizes. Territory colors, cluster shapes, and point counts are illustrative density, not measured data.
- **Domain boundaries** shown in Learn/Inspect for any protein without a real UniProt feature record are procedurally generated (seeded random, `decorate()`) for visual completeness — labeled generically ("Domain A", "Linker" etc.), not sourced.
- **Relationship threads** (the curated homology/family/fold/pathway edges shown on selection) are fixture data with plausible-sounding `basis` text, not a real computed similarity graph.
- **pLDDT per-residue coloring** for the predicted structure is a procedurally generated gradient (seeded random with an edge-low/center-high bias), not a real AlphaFold confidence output.
- **The protein-design trajectory** (Target → Objective → Site → Backbone → Sequence Design → Predicted Fold → Metrics → Compare → Candidate) is **entirely illustrative choreography.** Stage bodies, metrics (pLDDT/pTM/ipTM/ΔG/SASA values), and the two candidate comparisons are invented numbers meant to demonstrate the staged-disclosure interaction, not output from RFdiffusion/ProteinMPNN/AlphaFold2 (named in the copy as the illustrative method class). **No experimental validation exists for anything in this journey.** Every design screen in the prototype carries this disclaimer in its own copy — production must preserve an equivalent, equally prominent disclaimer regardless of whether the underlying computation becomes real or stays precomputed/illustrative.
- **Ask Atlas answers** are pattern-matched against the query string in the prototype (`askAtlas()` does keyword matching, not an LLM call) and are a stand-in for the real GPT-5.6 tool-calling loop. The **action-trace mechanism** (`▸ scene.filter(...)`) is the real interaction contract; the specific canned answers are not.
- **Mol\* is not mounted.** The structure viewport renders a stylized three.js backbone/tube/spacefill/ball-and-stick stand-in built from the seeded fixture coordinates, not a real structure file (no real PDB/AFDB fetch occurs).
- **The status chip text "UNIPROT 2026_02"** is a static illustrative label, not a live release check.

## Rules for the production pass

1. **Never present fixture descriptions, sequences (beyond the 3 real ones), relationships, or metrics as production data**, even temporarily during integration — gate them behind an explicit dev/demo flag if fixtures are needed for staging.
2. **Never present prototype geometry (point positions, structure stand-ins, domain boundaries) as scientifically authoritative.** All of it is placeholder for visual/interaction purposes only.
3. Production must replace every fixture data source without changing the **interface contract** described in `UI_INTEGRATION_HANDOFF.md` — same states, same triggers, same visual/camera responses, real data underneath.
4. Where production computation is genuinely precomputed (e.g., a batch design-trajectory pipeline run offline), the interface must **say so explicitly**, exactly as the prototype's design-journey panel does — this is a permanent interface requirement, not a placeholder to remove once "real" computation exists, unless the computation becomes truly live end-to-end.
5. If a real data field is unavailable for a given protein (no resolution, no known pathway, etc.), show it as explicitly unknown — do not backfill with fixture-style generated placeholder text in production.
