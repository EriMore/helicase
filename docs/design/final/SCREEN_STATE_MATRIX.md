# Screen State Matrix

Every named state the prototype ships, with its full interaction contract. Shared constants (exact easing curve, tween durations, sound envelope) are defined once in `MOTION_AND_CAMERA_SPEC.md` / `SOUND_SPEC.md` and referenced by name here rather than repeated per row — this table's job is to say *which* constant applies to *which* state, not to redefine them.

**Universal rules that apply to every state below unless noted otherwise:**
- **Cancellation:** any state reachable via a scene tween can be interrupted by a new navigation call — the in-flight tween is abandoned from its current interpolated position (no queueing). See `MOTION_AND_CAMERA_SPEC.md` §Interruption.
- **Interruption by direct input:** while a tween is in flight, orbit/pan/zoom input is a no-op until the tween completes or is replaced.
- **Reduced-motion default:** ambient drift disabled, all camera tweens land instantly (damping k=1) instead of easing. Stated per-row only where a state has additional reduced-motion-specific behavior beyond this default.

---

## 1 · Loading & Arrival

| State | Trigger | Source → Dest | Visual | Camera | Timing / Easing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Static-logo loading** | App mount | (none) → `loading` | Static canonical logo mark (no spin, no spinner), thin scan-line sweep (`hx-scan`, decorative), stage label, numeric %, "Resolved N of 575,503 reviewed" | none (canvas not yet mounted) | Scan line 3.2s linear infinite; stage/progress update on a ~130ms poll | none | Not user-cancellable; auto-completes | Scan-line sweep should still run (it is not spatial motion) but should be dampened per standard reduced-motion practice if it reads as decorative animation | Not dismissible by the user — honest, deterministic completion only |
| **Universe arrival** | `phase` reaches `ready` | `loading` → `universe` (phase `ready`) | Point field fades/settles into view; header, depth rail, query bar, Ask Atlas entry point all become visible/interactive | Initial framing, `r≈600–640` | Instant reveal (no cross-fade timing specified beyond phase flip) | none | — | — | Rail opacity is explicitly gated on `phase!=='loading'` — nothing in the persistent chrome should flash in before this |
| **Light ambient orbit** | Idle (no input) for 3500ms, in `universe` or `territory` view only | (self-loop) | None beyond slow rotation | `theta += 0.00022 rad/frame` | Continuous while idle | none | Cancelled instantly by any pointer/keyboard input | Fully disabled | Never runs in `glance`/`inspect`/`design` views |
| **Universe navigation** (manual orbit/pan/zoom/focus) | Left-drag / right-drag / shift-drag / wheel / double-click | (self, any view with a live camera) | Continuous camera response, no panel change | Orbit 0.0045 rad/px · pan scales with `r` · zoom-to-pointer factor 1±0.05/0.09, clamped r 40–1700 · double-click focus: `r→max(160,r×0.6)` | Continuous, not tweened (except double-click focus, which is instant re-target, not a timed tween) | `tick` on double-click focus only | Blocked while a scene tween is in flight | Damping k forced to 1 (no floaty follow-lag) | This is the "weighty, accurate, discoverable" control layer — no onboarding overlay, discoverable through direct manipulation |

---

## 2 · Query & Ask Atlas

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Query input** | Type in query bar | `universe`/`territory` (self) | Live text in input; suggestion chips hide once typing starts | none | — | none | Backspace-to-empty reverts to idle/suggestion display | — | Distinct control from Ask Atlas — deterministic only, no natural-language parsing |
| **Query-driven reorganization** | Enter / submit arrow → `runQuery`/`onQuerySubmit` | `universe` (self) | Matched family pulls forward + lit; non-matches push out + dim to `dimNon`; result count + filter chip appear | Reframe to matched family, `r→380` | **1500ms** camera + **1500ms** point reflow, easeInOutCubic | `query` | New query replaces the in-flight reflow; `CLEAR` reverts | Instant reframe, no reflow animation | Empty/no-match query state should show a clear zero-result message (see Error states) rather than silently doing nothing |
| **Ask Atlas** | ⌘K or "ASK ATLAS" pill | any view (self, overlays) | Top-centered panel: input → answer prose + **visible action trace** (`▸ scene.…`) + suggestion chips | Whatever the invoked scene action does (e.g. `scene.startDesign` re-triggers that state's own camera behavior) | Panel rise 400ms; answer auto-dismisses ~9s after appearing | none on open; underlying triggered action plays its own cue | Dismiss button or timeout closes it; a new query while one is open replaces the answer | Auto-dismiss timer and panel rise still apply; any triggered scene action follows its own reduced-motion rule | Never a persistent sidebar. GPT explains/traverses/compares existing edges but must not invent them (production constraint, not just a prototype behavior) |

---

## 3 · Territory & Neighbourhood

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Territory selection** (pre-entry hover/affordance) | Pointer hover over a territory label/cluster | `universe` (self) | Territory label affordance highlights; cursor becomes pointer | none | Instant | none | Moving off cancels the hover state | — | Purely a discoverability affordance; does not change `view` |
| **Territory entry** | Click territory label / `enterTerritory(i)` | `universe` → `territory` | Focused family expands ×1.7; all others recede + dim; territory name resolves in rail | Target family centre, `r→260, phi→1.05` | **1500ms** camera / **1400ms** point reflow, easeInOutCubic | `enter` | New selection mid-tween replaces it | Instant | Prior universe camera snapshot saved to `levelCam.universe` |
| **Neighbourhood exploration** | Manual camera movement while in `territory` view | `territory` (self) | Local groups/hero labels resolve into view as camera moves | Free orbit/pan/zoom within the territory | Continuous | none | — | Damping k=1 | Not a distinct `view` state — a movement regime within Territory, this is where individual protein labels become legible |

---

## 4 · Protein & Identity

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Protein selection** | Click a hero point / `selectHero(id)` | `universe`/`territory` → `glance` | Bracket marker frames the point; family stays lit, rest dims to 0.6; identity panel rises | Fly to point, `r→150, phi→1.05` | **1600ms**, easeInOutCubic | `select` | New selection replaces the in-flight fly-to | Instant | Prior camera snapshot saved (`levelCam.universe` or `.territory`, whichever was current) |
| **Glance** (tab) | Default on selection, or click "GLANCE" tab | `glance` (self) | Short identity rows, one-paragraph function summary, one sourced fact (teal rule), citation line | none | Tab switch instant | none | — | — | Default/entry tab — always shown first, never Learn |
| **Learn** (tab) | Click "LEARN" tab | `glance` (self) | Richer rows (pathway/location/disease/homologues), Domains list, References list | none | Instant | none | — | — | Second-tier disclosure; never shown before Glance has been available |
| **Relationship threads** | Click "REVEAL" / `onToggleThreads()` (Glance only) | `glance` (self) | ≤3 thin curved lines to related points; each list item shows type/strength/source/status/basis; hover emphasizes one thread | none | Instant reveal | `tick` | "HIDE" toggles off | — | Off by default every time a new protein is selected |
| **Sequence expansion** | Click "SEQUENCE" / `onOpenSeq()` | any protein-context view → adds `seqOpen` overlay | Full-width bottom panel: real one-letter sequence (or virtualized domain overview for >4,000 residues), selection readout, legend | none | Panel rise 400ms | none | Close button / `onCloseSeq()` | — | Bidirectional: dragging residues highlights 3D structure; clicking 3D (in `inspect`) scrolls sequence to that residue |

---

## 5 · Structure Inspection

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Structure inspection** (entry) | "INSPECT STRUCTURE →" / `onInspect()` | `glance` → `inspect` | Structure emerges (fade+build) at marker position; universe dims to 0.24 (never fully removed); representation controls appear | `r→90, theta+=0.5, phi→1.02` | **1500ms**, easeInOutCubic | `enter` | New action replaces in-flight | Instant | Prior camera saved to `levelCam.protein`; marker hidden once structure is present |
| **Cartoon representation** | Default, or click "CARTOON" | `inspect`/`design` (self) | Ribbon/tube backbone rendering | none | Instant rebuild | `tick` (on explicit switch, not on default) | — | — | Default representation on every fresh selection |
| **Surface representation** | Click "SURFACE" | `inspect`/`design` (self) | Solid molecular surface | none | Instant rebuild | `tick` | — | — | — |
| **Ball-and-stick representation** | Click "BALL & STICK" | `inspect`/`design` (self) | Instanced atoms + bonds | none | Instant rebuild | `tick` | — | — | — |
| **Spacefill representation** | Click "SPACEFILL" | `inspect`/`design` (self) | Large instanced van-der-Waals spheres | none | Instant rebuild | `tick` | — | — | — |
| **Ligand visibility** | Toggle ligand control | `inspect` (self) | Ligand markers (illustrative amber spheres in the prototype) show/hide near a binding-relevant region | none | Instant | `tick` | Toggle again reverses | — | — |
| **Chain colouring** | Toggle color-mode control | `inspect` (self) | Recolors structure by chain (default) vs. by domain | none | Instant rebuild | `tick` | Toggle again reverses | — | "Domain" mode is the alternate state, not a separate named toggle |
| **Experimental structure** | Selected protein has `predicted:false` | (data-driven, not a click) | Evidence block shows method + resolution; **no** Confidence X-Ray control rendered at all | — | — | — | — | — | This is a gating rule, not a transition — the absence of the confidence UI is itself the required behavior |
| **Predicted structure** | Selected protein has `predicted:true` | (data-driven) | Evidence block shows "Predicted structure"; Confidence X-Ray control is offered | — | — | — | — | — | — |
| **Confidence X-Ray** | "SHOW CONFIDENCE X-RAY" / `toggleConfidence()` — **only available when predicted** | `inspect` (self) | Per-residue pLDDT coloring (4-stop gradient) + legend applied to the structure | none | Instant rebuild | `tick` | Toggle again reverses | — | Must never be conflated with experimental error/uncertainty — that concept doesn't apply to experimental structures |

---

## 6 · Protein Design Journey

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Protein-design initiation** | "DESIGN FROM THIS →" / `onStartDesign()` (eligible proteins only) | `glance`/`inspect` → `design`, stage 0 | Design Trajectory panel opens; sequence panel closes if open | `r→100, theta+=0.4, phi→1.0` | **1400ms**, easeInOutCubic | `enter` | — | Instant | Auto-enters `inspect` first if not already there |
| **Design stage: Target** (1/9) | Auto (stage 0) | `design` (self) | "Target locked: <name> (<id>)" prose; stage dot 0 active | none (structure already framed) | Instant per-stage | none | Next-stage control (or Ask Atlas `design`) advances | — | Every stage carries the permanent precomputed/no-validation disclaimer |
| **Design stage: Objective** (2/9) | Advance | `design` (self) | Objective prose (binder compactness/affinity goals) | none | Instant | none | — | — | — |
| **Design stage: Binding Site** (3/9) | Advance | `design` (self) | Hotspot residues flagged on structure | none | Instant | none | — | — | — |
| **Design stage: Backbone** (4/9) | Advance | `design` (self) | Candidate backbone scaffolds sampled; teal binder chain first appears | Structure morphs to reflect the new stage's geometry | Instant per-stage (structure rebuild, not camera tween) | none | — | — | Copy explicitly names the illustrative method class (RFdiffusion-class) |
| **Design stage: Sequence Design** (5/9) | Advance | `design` (self) | Backbone threaded with a designed sequence (ProteinMPNN-class, illustrative) | — | Instant | none | — | — | — |
| **Design stage: Predicted Fold** (6/9) | Advance | `design` (self) | Predicted-fold structure shown | — | Instant | none | — | — | — |
| **Design stage: Metrics** (7/9) | Advance | `design` (self) | Metrics table: pLDDT, pTM, ipTM, ΔG, SASA | — | Instant | none | — | — | `showDesignMetrics=true` |
| **Candidate comparison** (Compare, 8/9) | Advance | `design` (self) | Two labeled candidates side by side with distinct metrics; user can select one (`design.candidate`) | — | Instant | `tick` on candidate select | Re-selecting the other candidate replaces the choice | — | This is the **candidate comparison** state explicitly named in scope |
| **Final candidate** (Candidate, 9/9) | Advance | `design` (self) | "SELECTED" row shows the chosen candidate's metrics as the final output | — | Instant | none | — | — | Terminal stage of the journey; Exit returns to `inspect` |
| **Design exit** | "EXIT ✕" / `onExitDesign()` | `design` → `inspect` | Design panel closes; standard inspect panel returns | Camera holds at current inspect framing (no forced re-tween on exit in the prototype) | — | `back` (via `onReturn`-equivalent path) | — | — | — |

---

## 7 · Return & Spatial Restoration

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Return to Protein** | `Esc` / rail click / `onReturn()` | `inspect` → `glance` | Structure viewport clears (except retained selection sphere); identity panel returns | Restore `levelCam.protein` exactly | **1300ms**, easeInOutCubic | `back` | New nav replaces in-flight | Instant | Dim target relaxes to 0.6 |
| **Return to Territory** | `Esc` / rail click | `glance` → `territory` | Identity panel closes; territory-level point field returns | Restore `levelCam.territory` exactly | **1300ms**, easeInOutCubic | `back` | — | Instant | Only available if a territory snapshot exists (i.e., the user actually entered via a territory, not a direct query hit) |
| **Return to Universe** | `Esc` from territory, or logo/home click, or rail→Universe | any → `universe` | All panels close; full point field restored to base positions | Restore `levelCam.universe` exactly, or a default `{r:640, phi:1.12}` framing if none saved | **1500ms** camera / **1300ms** point reflow, easeInOutCubic | `back` | — | Instant | `onHome()` additionally clears the entire `levelCam` stack and any active query |
| **Exact spatial-context restoration** | (property of every return above) | — | — | Every `levelCam.<level>` entry is captured via `snap()` at descent time and replayed via `applySnap()` **verbatim** — not a re-derived "reasonable" framing | Same timings as the specific return above | — | A fresh descent overwrites that level's saved snapshot | Instant | This is the Depth Rail's core guarantee — treat it as a hard requirement, not a nice-to-have: users must land exactly where they were, at the same distance/angle |

---

## 8 · Theme & Motion

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Light mode** | Default, or theme toggle from dark | (self) | Warm paper background, matte/normal point blending, ink-dark text | unaffected | Token swap is instant (no cross-fade specified) | none | — | — | Flagship presentation |
| **Dark mode** ("Specimen Chamber") | Theme toggle from light | (self) | Deep neutral background, **additive** point blending (points glow), light ink text | unaffected | Instant | none | — | — | Equally authored, not an inverted filter — separate palette values throughout, see `DESIGN_TOKENS.md` |
| **Reduced-motion states** | `prefers-reduced-motion` (production) / `reduceMotion` prop (prototype) | (self, global modifier) | No visual change to layout, only to motion | Ambient drift fully disabled; all tweens land instantly (damping k=1) instead of easing over their normal duration | N/A — everything that would be a timed tween becomes a single-frame snap | Sound cues unaffected (they are not motion) | — | — | Applies globally, not per-state; every row above that lists a camera tween is instant under this mode |

---

## 9 · Error States

| State | Trigger | Source → Dest | Visual | Camera | Timing | Sound | Cancel / Interrupt | Reduced-motion | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Selection data miss** | Click resolves to no matching protein record | `universe`/`territory` (self, no transition) | No panel opens; view stays put | none | Instant | `deny` | — | — | Production: real data-fetch failures should degrade to this same "stay put, deny cue" behavior rather than a broken/blank panel |
| **Structure fetch failure** | `onInspect()` engine call fails to resolve PDB/AFDB | `glance` (stays, does not advance to `inspect`) | A defined loading→retry affordance in the structure panel area; universe remains visible/interactive | Camera does not commit to the inspect framing until structure resolves | — | none specified beyond the standard `enter` not firing | Retry re-attempts `onInspect()` | — | The prototype defines this path conceptually (`structure-loading→retry state; universe remains`); production must implement the actual retry UI |
| **Empty / no-match query** | Query submitted with no matching results | `universe` (self) | Explicit zero-result messaging (count shows 0), CLEAR still available | No reframe (nothing to frame) | Instant | `deny` | CLEAR resets | — | Must not silently do nothing — the zero state should be as legible as a successful match |
| **Invalid Ask Atlas action** | A query Ask Atlas can't act on (e.g. "why neighbours" with no selection) | (self, panel stays open) | Answer explains the missing precondition (e.g. "Select a protein first…") with a trace showing `scene.noSelection()` | none | Panel rise only, no scene action | none | — | — | Ask Atlas must always respond with a legible trace, even for a no-op — never a silent failure |
