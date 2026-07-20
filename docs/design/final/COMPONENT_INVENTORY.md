# Component Inventory

The prototype is a single Design Component (`Helicase Atlas.dc.html`, one `<x-dc>` template + one logic class) — there is no file-per-component split. This inventory enumerates its **logical** components: the distinct, independently-stateful regions of the interface, each with its purpose, the state/props driving it, and its states.

## 1. Loading Screen
- **Purpose:** honest, static loading — no spinner, no fake progress sparkle.
- **Drives on:** `state.phase==='loading'`.
- **Contents:** static logo mark (theme-correct, canonical asset), a single thin scan-line sweep (`hx-scan`, 3.2s linear infinite — decorative only, not a progress indicator), stage label (`STAGES[stage]`), numeric progress %, "Resolved N of 575,503 reviewed" detail line.
- **Data:** `progress` (0–1), `stage` (index into `STAGES`), `familiesMapped` (count, cosmetic ramp in the prototype).
- **Exit:** transitions to `phase:'ready'` automatically; not user-dismissible.

## 2. Global Nav / Header
- **Purpose:** brand anchor + global toggles, always present.
- **Contents:** logo mark (click → `onHome`) + wordmark (left); status chip ("UNIPROT 2026_02"), sound toggle, theme toggle (right).
- **States:** sound `○`/`●`; theme label shows the *destination* theme ("DARK" when in light mode, "LIGHT" when in dark).

## 3. Depth Rail
- **Purpose:** the primary spatial-orientation and back-navigation instrument (not a breadcrumb — a clickable backstack with exact camera restore).
- **Contents:** 5 fixed levels (Universe, Territory, Neighbourhood, Protein, Structure), each with a dot (filled+ringed teal when active, hollow/faint otherwise), a mono label, and — for Territory/Protein — an italic Spectral sub-label naming the current territory/protein.
- **Reachability rule:** a level is clickable only if "reachable" from the current state (i.e., a level at or above the current depth); unreachable levels render faint and inert.
- **Data:** `levels[]` (label, dot/ring/label colors, sub-label, click handler), `railHint` (contextual instruction text).

## 4. Query Bar
- **Purpose:** deterministic search/filter — explicitly distinct from Ask Atlas.
- **Visible when:** `view` is `universe`/`territory`, not loading, command field not open.
- **Contents:** input (placeholder: "name · accession · organism · family · function · domain…"), submit arrow, clear (when active), result state row (count + active filter chip), and idle-state suggestion chips (4 canned queries).
- **Data:** `query`, `queryActive`, `queryFilter`, `queryCount`, `suggestions[]`.

## 5. Identity Panel (Glance / Learn)
- **Purpose:** progressive identity disclosure for the selected protein.
- **Visible when:** `hasSelection` (a protein is selected, any non-universe/territory view except while Design panel owns the right side).
- **Contents (always):** accession + gene (mono header row), name (Spectral h1), organism (italic), evidence chip (experimental teal square / predicted amber circle).
- **Tabs:**
  - **Glance:** short rows (organism/gene/family/residues), one-paragraph function summary, one teal-rule-highlighted **sourced fact**, source citation line.
  - **Learn:** richer key/value rows (pathway, location, disease, homologues, etc.), **Domains** list (colored swatch + label + residue range), **References** list (italic citations).
- **Relationship Threads** (nested, same panel, below the tabs): reveal/hide toggle (off by default), up to 3 threads each with a colored type-swatch, name, accession, type label, status tag (measured/computed), and italic one-line basis. Hover emphasizes one thread.
- **Action row:** "INSPECT STRUCTURE →" (primary, solid ink button — only when a structure is resolvable), "SEQUENCE" (secondary), "DESIGN FROM THIS →" (teal-bordered, only when `canDesign`).
- **Data:** the full per-protein data contract (see `UI_INTEGRATION_HANDOFF.md` §7).

## 6. Structure Inspection Panel
- **Purpose:** representation controls + evidence-gated confidence display for the structure mounted in the 3D viewport.
- **Visible when:** `view==='inspect'`.
- **Contents:** evidence block (method+resolution for experimental; "Confidence undefined" messaging is implicit — Confidence X-Ray section only renders `sc-if predicted`), Confidence X-Ray toggle + pLDDT legend gradient (predicted only), Representation control (Cartoon / Surface / Ball & Stick / Spacefill — single-select chip row), color-mode toggle (Chain/Domain), ligand-visibility toggle.
- **Data:** `rep`, `colorMode`, `confidence` (bool), `ligands` (bool), `sel.predicted`, `sel.plddt`, `sel.method`, `sel.resolution`.

## 7. Design Trajectory Panel
- **Purpose:** staged, explicitly-precomputed protein-design journey.
- **Visible when:** `view==='design'`.
- **Contents:** 9-stage vertical progress list (Target→Objective→Binding Site→Backbone→Sequence Design→Predicted Fold→Metrics→Compare→Candidate) with dot/ring/label state per stage (done/active/pending), current-stage prose body, stage-specific content (metrics table at stage 6/8, two-candidate comparison at stage 7), permanent provenance disclaimer line ("Precomputed trajectory · not live computation… No experimental validation."), exit control.
- **Data:** `design.stage` (0–8), `design.candidate` (selection between two compared candidates).

## 8. Sequence Panel
- **Purpose:** full-width real sequence viewer, bidirectional with the 3D structure.
- **Visible when:** `seqOpen`.
- **Contents:** header (name + close), scrollable residue ruler (`seqRef` mount — real one-letter sequence for the 3 sourced proteins; virtualized domain-overview + minimap for titin-scale proteins over 4,000 residues), footer legend (domain/secondary-structure/confidence-track swatches) + live selection readout.
- **Data:** `sel.sequence` (or none, tagged `REPRESENTATIVE` for non-sourced proteins), `seqSel` (residue range), domain/secondary-structure annotations.

## 9. Ask Atlas (Command Field)
- **Purpose:** semantic Q&A + scene control via GPT-5.6, summonable only — never a persistent sidebar.
- **Trigger:** ⌘K or the bottom-right "ASK ATLAS" pill (with contextual nav hint above it, e.g. "Esc returns one level").
- **Contents (open state):** input field; on answer — a status dot, the answer prose, a **visible action trace** (`▸ scene.filter(...)`-style lines), suggestion chips, dismiss control. Auto-dismisses ~9s after an answer.
- **Data:** `command`, `commandOpen`, `atlas` (answer + trace), `atlasSuggest[]`.

## 10. Universe Canvas (3D scene root)
- **Purpose:** the point-field/camera/structure host. Not a template component in the usual sense — a `<canvas>` mount (`canvasRef`) plus an absolutely-positioned label overlay (`labelsRef`) for territory and hero (protein) name labels projected from 3D to 2D each frame.
- **Owns:** point field (instanced shader, family + halo points), territory ambient arcs, selection bracket marker, structure stand-in group (`structGroup`), relationship-thread line group, camera model and its loop.

## 11. Occlusion Scrims & Vignette
- **Purpose:** guarantee text legibility over the dense point field at any camera angle — the "specimen glass" optical layer's outermost layer.
- **Contents:** top scrim (150px), bottom scrim (120px), full-viewport vignette — all `pointer-events:none`, purely optical.

## Shared visual primitive: `.hx-glass`
Every persistent panel (header clusters, depth rail, query bar, identity/inspect/design/sequence/command panels) uses the same treatment: `backdrop-filter: blur(16px) saturate(1.2)`, `--glass` fill, `--glass-brd` 1px edge, 2–3px radius. This is the one reusable "component" in a strict sense — document it as a single shared style module in production (e.g. a `GlassPanel` wrapper), not copy-pasted per panel.
