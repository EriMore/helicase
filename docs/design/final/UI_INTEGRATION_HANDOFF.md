# UI Integration Handoff

**Direction:** *The Illuminated Plate* — the protein universe as a luminous scientific plate (ink specimens on warm paper), not a dark field with neon. Light is the flagship; dark ("Specimen Chamber") is equally authored. Teal is a **semantic signal only** (current location / selection / active tool), never decoration.

This is the primary engineering contract. `prototype/Helicase Atlas.dc.html` is the executable version of everything below — where this document and the source disagree, the source wins (see `DESIGN_TARGET.md`). Full per-state detail (trigger/source/destination/visual/camera/timing/sound/cancellation/interruption/reduced-motion/notes) lives in `SCREEN_STATE_MATRIX.md`; this document is the higher-level map plus the data/token contracts.

---

## 1. Spatial hierarchy (5 levels)

| Level | View state | Camera r | Point treatment | UI |
|---|---|---|---|---|
| Universe | `universe` | ~560–640 | all territories, full density, ambient arcs | query bar, depth rail, territory + hero labels |
| Territory | `territory` | ~260 | focused family expands ×1.7, others dim to `dimNon` | territory label, neighbourhood cues |
| Neighbourhood | (within territory, same `territory` view state) | ~200 | local groups resolve as camera moves within the family | hero labels of that family |
| Protein | `glance` | ~150 | selected point framed by bracket marker, neighbourhood still visible | identity panel (Glance/Learn), threads |
| Structure | `inspect` / `design` | ~90 / ~100 | Mol* mount point (stylized backbone stand-in in the prototype) | representation, confidence, sequence, design |

The **Depth Rail** (left) is the orientation + spatial-return instrument: current level highlighted in teal with its territory/protein sub-label; higher levels are click-to-return with **exact camera restore** (`levelCam[]` snapshots, see `MOTION_AND_CAMERA_SPEC.md`). `Esc` returns one level. This replaces all text back-links — there is no separate breadcrumb.

---

## 2. Interaction → SceneController map

Condensed map; full field-by-field behavior (including exact durations, sounds, cancellation/interruption/reduced-motion per state) is in `SCREEN_STATE_MATRIX.md`.

### Select protein
**Trigger:** click point / `selectHero(id)` · **universe|territory → glance** · **Engine:** `scene.select(accession)` → `data.getProtein(accession)` · **Visual:** bracket marker frames the point; family stays lit, rest dims; identity panel rises in a specimen-glass plate. · **Camera:** fly to point, r→150, continuous, 1600ms. · **Sound:** `select`. · **Error:** data miss → keep universe, `deny` cue.

### Enter territory
**Trigger:** click territory label / `enterTerritory(i)` · **universe → territory** · **Engine:** `scene.focusTerritory(familyId)` · **Visual:** focused family expands ×1.7, others recede + dim; territory name resolves. · **Camera:** target family centre, r→260, 1500ms; prior universe cam saved. · **Exit:** `navTo('universe')` restores exact snapshot.

### Inspect structure
**Trigger:** `INSPECT STRUCTURE →` / `onInspect()` · **glance → inspect** · **Engine:** `structure.resolve(accession)` → PDB (`pdbId`) or AlphaFold (`AF-<acc>-F1`); mount **Mol\*** in the framed viewport. · **Visual:** structure emerges (fade+build) at marker position; universe dims to 0.24, never removed. · **Controls:** representation (cartoon/surface/ball-and-stick/spacefill), ligands, color mode (chain/domain). · **Error:** fetch fail → structure-loading→retry state; universe remains.

### Confidence X-ray
**Trigger:** `SHOW CONFIDENCE X-RAY` / `toggleConfidence()` — **only when `predicted===true`** · **Engine:** `structure.setColoring('plddt')` · **Visual:** per-residue pLDDT coloring (orange→yellow→cyan→blue) + legend. Experimental structures show method/resolution instead and never expose this control. Never conflate confidence with experimental error.

### Sequence ↔ structure (bidirectional)
**Trigger:** `SEQUENCE` / `onOpenSeq()`; drag residues → `setSeqSel(a,b)`; click 3D → `pickResidueFromStructure()` · **Engine:** `structure.highlightResidues(a,b)` ↔ `sequence.scrollTo(residue)` (Mol\* selection API). · **Visual:** selected residues invert to teal; a teal sphere marks the mapped backbone point. Domain / secondary-structure / (predicted) confidence tracks above. · **Large proteins (titin, 34,350 aa):** virtualized domain overview + minimap, not a single line — real letters stream from UniProt on zoom. Real one-letter sequences ship for P69905, P01308, P42212; others tagged `REPRESENTATIVE` until UniProt streams.

### Relationship threads
**Trigger:** `REVEAL` / `onToggleThreads()` (glance only) · **Engine:** `graph.relations(accession, types[])` — edges come from **annotations/databases/computed similarity, never GPT**. · **Visual:** ≤3 thin curved lines to related-territory endpoints; each list item exposes type · strength · source · measured/computed status · one-line basis. Legend maps color→type. Hover emphasizes one thread. Subordinate to proteins; off by default.

### Query the Universe (deterministic)
**Trigger:** type + Enter / `runQuery(q)` · **Engine:** `scene.filter({family|organism|structureType|…})` returns count. · **Visual:** matched family pulls forward in teal; others push out + dim to `dimNon` (still visible). Result count + active filter chip + CLEAR. Distinct from Ask Atlas.

### Ask Atlas (GPT-5.6, semantic + scene control)
**Trigger:** ⌘K / `askAtlas(q)` · summonable, never a persistent sidebar. · **Engine:** GPT tool-calls on the SceneController; returns a scene action + transient annotation with a **visible action trace** (`▸ scene.filter(...)`). Auto-dismisses ~9s. Can start the design journey. GPT explains/traverses/compares edges but **does not invent them.**

### Protein-design journey (precomputed)
**Trigger:** `DESIGN FROM THIS →` / `onStartDesign()` (eligible proteins). · **Stages:** Target → Objective → Site → Backbone → Sequence design → Predicted fold → Metrics → Compare → Candidate. Structure morphs per stage; a teal binder chain appears from the backbone stage. Metrics (pLDDT/pTM/ipTM/ΔG/SASA) and candidate comparison are shown **explicitly labelled precomputed — not live computation, no experimental validation.** No fake progress bars or sparkle.

### Return / camera restore
`onReturn()` / `Esc` / rail click: inspect→glance→territory→universe, each restoring the **exact** saved camera snapshot. `onHome()` clears all and returns to universe.

### Theme / sound
`onToggleTheme()` swaps the full token set + point palette + fog + blending (normal in light, additive in dark). `onToggleSound()` — off by default, parameterized Web-Audio cues (select/enter/query/back/tick/deny — see `SOUND_SPEC.md`), persistent mute (production must add persistence — see `IMPLEMENTATION_NOTES.md`).

---

## 3. Navigation & camera spec
Full constants in `MOTION_AND_CAMERA_SPEC.md`. Summary: **Orbit** left-drag · **Pan** right/middle/shift-drag (speed scales with r) · **Zoom** wheel toward pointer (pinch = ctrl+wheel) · **Focus** double-click · **Ambient** very slow drift, pauses on any input, resumes after 3.5s idle · **Reduced-motion** disables drift + snaps tweens instantly. Camera model: spherical (`tgt`, `r`, `theta`, `phi`) with critically-damped follow and interruptible easeInOutCubic tweens. Replace with `camera-controls`/Drei `CameraControls` in production; keep the semantic-zoom + snapshot-restore layer.

## 4. Density & LOD
Prototype: 6 families × 1,700 + 3,200 halo ≈ 13,400 GPU points (instanced shader, size clamped, fog-faded). Production: swap the `base`/`fam` buffers for the real **75,000 delivery profile** (of **575,503 indexed**) — visual system unchanged. Distance-scaled point size + fog already encode LOD; add GPU picking + frustum culling for the full corpus.

## 5. Optical readability layer ("specimen glass")
`.hx-glass` = `backdrop-blur(16px) saturate(1.2)` + tinted `--glass` + `--glass-brd` edge, minimal radius. Applied behind nav, identity, inspect, sequence, command, legend. Top/bottom **scrims** (`--scrim-top/-bot`) guarantee text legibility at any camera angle — validated against dense clusters behind panels. Degrades to tinted panel where `backdrop-filter` is unavailable.

## 6. Design tokens (semantic)
Full table in `DESIGN_TOKENS.md`. Headline values:
```
                        light            dark
--bg                    #efece4          #0d1013
--ink                   #22262b          #e9e7e0
--teal (SIGNAL ONLY)    #0c8c78          #34d6b8
territory palette       #3c5a86 #8f4a44 #3f6f60 #9a7a34 #6a4a70 #4a4f57   (dark: lightened)
evidence                experimental = teal square · predicted = amber (#c9922f) circle
confidence scale        #e8622a → #e8a93a → #5fc7d6 → #2e6fe0  (pLDDT low→high)
thread types            complex #0c8c78 · interaction #5a7fb5 · homology #b07b3a · process #7a6a9c
```
Type: **Spectral** (editorial serif — names, prose, facts) + **IBM Plex Mono** (identifiers, residues, labels, metrics). No default-AI sans. Motion: 1300–1600ms scene tweens (easeInOutCubic), 400–500ms panel rises, ambient 0.00022 rad/frame.

## 7. Data requirements per protein
`accession, name, gene, organism, family, residues, predicted:boolean, plddt?, method, resolution, pdb|afdb, chains, sequence, domains[{label,range}], process, location, pathway, homologues, disease?, refs[], sourcedFact` + `relations[{acc,name,type,strength,status,basis}]`. Every educational claim and every edge must be traceable; unknowns stay explicitly unknown. See `SCIENTIFIC_DATA_BOUNDARIES.md` for what in the prototype is fixture vs. real.

## 8. States shipped
See `SCREEN_STATE_MATRIX.md` for the full enumerated list with per-state trigger/destination/visual/camera/sound/cancellation/interruption/reduced-motion detail.

## 9. Acceptance-criteria status
See `VISUAL_ACCEPTANCE_CRITERIA.md` for the full checklist (all items pass in the prototype as the design target; that document is what production must be re-verified against).

**Open for engineering:** mount real Mol\*; wire SceneController events (`onComplete`/`onError`) to the states enumerated in `SCREEN_STATE_MATRIX.md`; swap point buffers for the live shard loader; connect the real relationship graph + GPT tool schema; add a PAE panel where available; persist theme/sound preference (see `IMPLEMENTATION_NOTES.md`).
