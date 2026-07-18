# Helicase Atlas — Build Week MVP Dossier (for Codex)

*Fly through the protein universe, dive into any real structure — then describe a protein and watch one be born.*

**Target:** OpenAI Build Week (openai.devpost.com)
**Submission deadline:** July 21, 2026, 5:00 PM PT
**Hard requirement:** must use **Codex + GPT-5.6** meaningfully (both, per rules)
**Judging (equal weight):** Application of the model · Design · Potential Impact · Novelty
**This document is the implementation brief. Codex: read Section 4 (scope guardrails) before writing any code.**

---

## 1. What we are building (one paragraph)

Helicase Atlas is a single-screen, browser-native experience that turns the known protein universe into a navigable night sky, lets you dive into any real structure rendered beautifully with confidence coloring, converse with a **GPT-5.6 copilot that reasons over the actual structure and pilots the view** — and then, on request, **designs a brand-new protein in front of you**: a backbone diffusing out of noise, folding, docking against a target site, a sequence threading through it, and a real predicted-confidence score resolving. It is "Google Earth for proteins" fused with a reasoning scientist who can *make new proteins on command*. The generation is real science (RFdiffusion → ProteinMPNN → Boltz-2), pre-computed offline and revealed live. It is beautiful enough to sit next to the showcase's best 3D work, and it does something — creates a novel protein because you asked — that judges have never seen in a hackathon demo.

## 2. Why this wins Build Week (mapped to the four criteria)

A beautiful viewer with an explaining copilot tops out at "wow, beautiful" — because every action is *retrieval and explanation*, showing you what already exists. Judges have seen "AI explains a thing while the camera moves." The ceiling on that genre is admiration, not astonishment. **Astonishment comes from watching the machine create something real, live.** That is the verb at the center of this build.

- **Application of GPT-5.6 (novel, load-bearing):** GPT-5.6 does two things no generic chatbot does. (1) It **reasons over structured molecular context** (sequence, secondary structure, pLDDT/PAE confidence, ligands, annotations) and grounds every claim in it. (2) Its reasoning output **drives the 3D scene and launches design jobs** via typed tool calls — including `design_binder`, which turns a natural-language spec ("a small protein that binds this exposed loop") into a target-site selection and a generation run. The judges' explicit question — "can other models do the same, or does it showcase the model's strengths uniquely?" — is answered by *reasoning-that-designs-molecules-and-pilots-a-cinematic-scene*. Strong, unique yes.
- **Design (cinematic, showcase-tier):** dark deep-space aesthetic, luminous structures, information-carrying motion, confidence-as-color. The diffusion-denoising reveal is inherently cinematic — noise → chaos → order → a real fold snapping into place — the Midjourney "watch it appear" moment, but for the molecule of life. Built on the same Three.js/React/Next.js stack as the showcase winners.
- **Potential Impact:** makes modern structural biology legible to students and the public, while remaining scientifically honest (real data, real confidence, honest uncertainty) enough that researchers respect it. The design loop hints at the real prize — democratizing not just *understanding* proteins but *creating* them. Clear "For Humanity" story. Every structure and design is real, sourced, and scored.
- **Novelty:** protein-universe-as-night-sky + a copilot that pilots the camera + **design-by-talking with a live diffusion reveal** + **confidence-as-visceral-doubt (the X-ray)**. Each is unseen; together they are unlike anything in the showcase or the market (Cradle, Tamarind, PyMOL have nothing like this as an experience).

## 3. Codex build feasibility (honest)

**Can Codex build this in the window? Yes — this exact slice, not the platform, and with the generation pre-computed.** Codex is strongest on the showcase stack and this is squarely in it. Feasibility rests on five de-risking decisions already made below: use **Mol\*** for structure rendering (don't hand-roll a molecular renderer), use **public REST/BinaryCIF APIs** (no data pipeline), **precompute the star-map** offline, keep the copilot's tool surface **small and typed**, and — critically — **pre-compute the designs offline and play back the real trajectory live** (do not attempt live RFdiffusion in-browser in 3 days). The single biggest risk is scope creep; Section 4 is the defense.

## 4. Scope guardrails (READ FIRST — non-negotiable)

**IN scope (build exactly this, nothing more):**
1. One screen. One continuous experience. No routing, no dashboards, no auth, no accounts.
2. The star-map fly-through (precomputed embedding of a curated ~1,000–5,000 protein subset).
3. Dive-to-structure with Mol* rendering + confidence coloring.
4. The GPT-5.6 copilot with a **fixed, typed toolset** (≤7 tools) that reasons over the selected structure and drives the scene.
5. **The design-by-talking loop (the headline).** `design_binder` → play back a **pre-computed real RFdiffusion→MPNN→Boltz trajectory** as a live diffusion-denoising animation → dock → reveal real score. 3–5 pre-baked designs across 3–5 target sites.
6. **The confidence X-ray (second act).** Strip a structure to its trusted core; low-confidence regions become shimmering probability clouds.
7. Three "guided tours" (curated entry points) so a cold-open demo lands in <10 seconds.

**OUT of scope (do NOT build — these lose the hackathon by eating time):**
- **Live, in-browser generation.** Designs are pre-computed offline and revealed live. Do not run RFdiffusion at demo time.
- Arbitrary open-ended design (any target, any spec). Support the 3–5 pre-baked target sites; the copilot gracefully steers users toward them.
- User-uploaded sequences / live folding of novel input. (Optional stretch only if M0–M5 are done — see §9.)
- The full 200M-structure map. Curate a beautiful subset; imply the scale.
- Collaboration, project graph, provenance graph, multiplayer, saving, wet-lab ordering (mention it as roadmap in copy only).
- Any backend beyond a thin API proxy for GPT-5.6 + structure fetching + serving pre-baked trajectories.
- Mobile optimization beyond "doesn't break."

**The rule:** if a feature does not appear in the 3-minute demo video, it does not get built. The two gasps (design, X-ray) plus the dive are the video. Guard them.

## 5. Architecture (thin, hackathon-grade)

```
┌───────────────────────────────────────────────────────────┐
│  BROWSER (Next.js + React + TypeScript + Three.js + Mol*)  │
│                                                            │
│  • StarMap scene (Three.js): instanced points, camera fly  │
│  • StructureView (Mol*): mmCIF/BinaryCIF, pLDDT coloring,   │
│    X-ray mode, imperative API (focus/highlight/color)      │
│  • DesignScene: plays back pre-baked diffusion trajectory  │
│    (noise → fold → dock), score-card reveal                │
│  • CopilotPanel: chat; renders GPT-5.6 tool-calls as scene │
│    actions + design launches; streams reasoning            │
│  • SceneController: single source of truth; the ONE module │
│    the user AND the copilot AND the designer all drive     │
├───────────────────────────────────────────────────────────┤
│  THIN SERVER (Next.js API routes / edge functions)         │
│  • /api/copilot   → GPT-5.6 (Responses API, tools, stream) │
│  • /api/structure → proxy/cache RCSB + AlphaFold DB fetches │
│  • /api/design    → serve pre-baked trajectory + score JSON │
│  • context builder: assembles structured molecular context │
├───────────────────────────────────────────────────────────┤
│  STATIC DATA (precomputed at build time, committed to repo)│
│  • starmap.json:   curated proteins + 3D coords + metadata │
│  • designs/*.json: pre-baked RFdiffusion trajectories +    │
│    MPNN sequences + Boltz scores, keyed by target site     │
│  • tours.json:     3 curated guided entry points           │
└───────────────────────────────────────────────────────────┘
        │ fetch on demand
        ▼
  PUBLIC APIs: RCSB PDB · PDBe · AlphaFold DB · UniProt
  OFFLINE (pre-build): RFdiffusion · ProteinMPNN · Boltz-2
```

**Key principle:** the `SceneController` is the heart. The user (mouse/keyboard), the copilot (GPT-5.6 tool calls), and the designer (trajectory playback) all issue the *same* commands to it. This is what makes the copilot feel like it's genuinely piloting the experience — and makes "design a protein" feel like the copilot reaching into the scene and building one.

## 6. The GPT-5.6 integration (the part that must be excellent)

This is 25%+ of the score. Do it right.

**6.1 Context assembly (server-side, per selected structure).** When a protein is selected, build a compact structured context object:
```json
{
  "id": "P00533", "name": "Epidermal growth factor receptor",
  "source": "AlphaFold DB", "length": 1210,
  "confidence": {"mean_pLDDT": 84.2, "low_conf_regions": [[1,25],[640,690]]},
  "secondary_structure_summary": "…", "domains": [{"name":"…","range":[57,168]}],
  "ligands": [], "function_annotation": "…(from UniProt)…",
  "designable_sites": [{"site_id":"egfr_loop","range":[640,690],"has_prebaked_design":true}],
  "citation": "…"
}
```
Fetch from RCSB/PDBe/AlphaFold DB/UniProt REST APIs; cache aggressively. Note `designable_sites` — it tells the model which sites have a pre-baked design so it steers users there naturally.

**6.2 Model call.** Use the **Responses API** with GPT-5.6, streaming, with a typed tool list. Let it reason (this is a reasoning showcase) but keep latency demo-acceptable. System prompt: a rigorous structural-biology guide that (a) grounds every claim in the provided context, (b) is honest about confidence and never invents structure, (c) uses tools to *show* and *make* rather than only tell, and (d) when asked to design, maps the request to a `designable_site` and launches `design_binder`.

**6.3 The typed toolset (≤7 — do not exceed).**
| Tool | Signature | Effect on scene |
|---|---|---|
| `design_binder` | `(target_site: string, spec: string)` | **Headline.** Launches DesignScene: plays pre-baked diffusion trajectory → docks → reveals score |
| `focus_residues` | `(residue_ids: int[])` | Camera flies to + highlights those residues |
| `highlight_domain` | `(domain_name: string)` | Isolates/colors a domain |
| `set_representation` | `(style: 'cartoon'\|'surface'\|'sticks')` | Changes Mol* representation |
| `color_by` | `(scheme: 'confidence'\|'trusted_core'\|'hydrophobicity')` | Recolors; `trusted_core` triggers the X-ray |
| `compare_to` | `(protein_id: string)` | Loads + superimposes a second structure |
| `fly_to_protein` | `(protein_id: string)` | Returns to star-map + dives to another star |

Each tool call from GPT-5.6 is executed by `SceneController` and produces a visible, animated change. **The `design_binder` → diffusion-reveal → score loop is the demo's magic moment.** The reason → tool → visible-creation loop is the whole novelty argument, made real.

**6.4 Honesty rule (also scores on Design/safety).** The copilot must surface confidence and never render false certainty — for both prediction *and* generation. When it designs, it says the design is pre-computed and that a predicted score is not a wet-lab result: high ipTM ≠ confirmed binding. The X-ray makes uncertainty visible. This is scientific integrity *and* a judging positive ("safety of the user," "well thought-out"). It is also the line that separates "impressive and honest" from "impressive until someone asks."

## 7. The visualization (the part that must be beautiful)

**7.1 Star-map scene.** Three.js, instanced points (one draw call for thousands). Each star = one protein, positioned by a **precomputed 2D/3D embedding** of structural/sequence similarity (compute offline; UMAP/PCA to 3D; commit coords to `starmap.json`). Color by family; size by a real quantity. Cinematic eased fly-through, idle drift, bloom/DoF glow, parallax backdrop. Hover → label. Click → cinematic dive.

**7.2 Structure view (Mol*).** Embed Mol* driven imperatively (not its default UI). Default: cartoon colored by pLDDT (AlphaFold blue→orange) — instantly legible and signals legitimacy. Load BinaryCIF for speed. Expose methods matching §6.3 tools.

**7.3 The design scene (the headline visualization).** When `design_binder` fires:
- A **noise cloud** of points erupts near the target site.
- Over ~50 steps, the cloud **denoises** — interpolating from chaos toward a folded backbone — with a live HUD ticking the real pipeline: `RFdiffusion → ProteinMPNN → Boltz-2`, step N/50. Color shifts violet→confidence-blue as it resolves.
- The folded mini-protein **pops into being**, docked against the target; the camera swings to frame the interface.
- A **score card** reveals real values: `pLDDT`, `ipTM (dock)`, residue count, "novel vs. PDB."
- The copilot narrates the birth.

**Critical:** the trajectory is **real, pre-computed data played back**, not procedural. Pre-run RFdiffusion offline on the target sites, capture per-step backbone coordinates, store as JSON, animate those. Everything else (HUD, reveal, score card, the `design_binder` wiring) is the pattern to keep.

**7.4 The confidence X-ray (second act).** Strip the structure to what the model trusts: high-pLDDT core stays solid; low-confidence regions become translucent, bloated, **visibly wobbling** probability clouds. A "solved" protein becomes a crisp core wrapped in fog. Novel viz + the integrity thesis made physical. Triggered by the rail button or `color_by('trusted_core')`.

**7.5 Motion grammar.** A small reusable set: `dive` (map→structure), `surface` (structure→map), `focus` (camera to residues), `morph` (align two structures), `reveal-confidence`, `denoise` (the design reveal), `wobble` (X-ray uncertainty). Reuse everywhere. Every motion communicates.

**7.6 Aesthetic spec.** Deep near-black space (#05060a-ish), luminous structures, one restrained accent for prediction chrome, a distinct accent (violet) for *generation*, monospace for sequence/IDs, generous negative space, tabular figures. Science carries the color; chrome stays out of the way.

## 8. The demo script (build backward from this 3-minute video)

Everything in §4–7 exists to make this land. The video climbs to the design gasp.

1. **[0:00–0:18] Cold open on the night sky.** Camera drifts through a luminous constellation of thousands of proteins. "Every star is a real protein." Immediate showcase-tier hook.
2. **[0:18–0:45] The dive.** Click a star; camera rushes in; cross-fades into a gorgeous confidence-colored structure (a famous one — GFP, hemoglobin, EGFR). "This is [protein], from the AlphaFold database."
3. **[0:45–1:15] The copilot reasons, then the X-ray.** Ask *"where should I not trust this model?"* GPT-5.6 streams grounded reasoning, then the **confidence X-ray** dissolves the uncertain loops into shimmering fog. "A solved structure is really a confident core wrapped in doubt." First gasp: uncertainty made visible.
4. **[1:15–2:30] THE HEADLINE — design-by-talking.** User types: *"Design a small protein that binds this exposed site."* GPT-5.6 reasons, calls **`design_binder`**, and a **noise cloud erupts and denoises into a folded protein**, docking against the target, HUD ticking `RFdiffusion → ProteinMPNN → Boltz-2`. The score card reveals `ipTM 0.78 · pLDDT 88 · novel vs. PDB`. Copilot: *"That protein did not exist a minute ago."* **This is the moment they'll still be talking about.** Hold it. Let it breathe.
5. **[2:30–2:50] Breadth + honesty.** Quick second design or a guided tour to imply scale; copilot states plainly that designs are pre-computed and a predicted score isn't a wet-lab result — "in the full product, this orders the design from a lab to find out if it really binds."
6. **[2:50–3:00] Close.** Pull back to the full night sky. "Helicase Atlas — explore the protein universe, and create new life in it. Built with Codex + GPT-5.6."

## 9. Build plan for Codex (ordered; stop-when-time-runs-out)

Build in this order so every checkpoint is demoable. If time runs out, you still have a working demo.

**Milestone -1 — Offline pre-compute (do this FIRST, in parallel, off the critical path).** Run RFdiffusion → ProteinMPNN → Boltz-2 offline on 3–5 target sites (use a hosted GPU / Colab / Tamarind-style service; do NOT build infra). Capture per-step backbone coordinates, final sequences, and scores. Commit as `designs/*.json`. **The demo's headline depends on this data existing — start it before the UI.**

**Milestone 0 — Skeleton.** Next.js + TS + Three.js + Mol* rendering "hello structure" (one hardcoded PDB in Mol*, one Three.js star-field). Prove the stack.

**Milestone 1 — The dive.** Star-map with `starmap.json`; click-to-dive cinematic transition into Mol* with confidence coloring. **If only this works, you already have a showcase-tier demo.**

**Milestone 2 — The design reveal (highest wow-per-hour after the dive).** `DesignScene` plays back a pre-baked trajectory: noise cloud → denoise → fold → dock → score card. Wire it to a button first (no copilot yet). **This is the headline; prioritize it over copilot breadth.** Get ONE design playing beautifully.

**Milestone 3 — The copilot loop.** `/api/copilot` → GPT-5.6 Responses API, streaming, typed tools. Wire `design_binder` (launches M2) and `color_by('trusted_core')` (launches the X-ray) first — those are the two gasps. Then `focus_residues`.

**Milestone 4 — The X-ray + depth.** Confidence X-ray mode (trusted core solid, uncertain regions fog + wobble). Remaining tools (`compare_to`, `highlight_domain`), real context assembly, honesty surfacing.

**Milestone 5 — Polish (the multiplier).** Motion grammar, bloom/DoF, easing, the denoise choreography timing, sound design (optional), 3 guided tours, the cold-open. **Reserve real time here — Build Week is won on polish, and the design reveal's timing/easing is where the gasp lives or dies.**

**Stretch (only if M-1..M5 are done):** a second target site; user-typed spec mapped to a pre-baked design by GPT-5.6; user-typed sequence → ESMFold API → new star in the map. High wow, high risk; do not start until the two gasps are locked.

## 10. Data & APIs (all public / all pre-computed)

| Need | Source | How |
|---|---|---|
| Structures (experimental) | RCSB PDB / PDBe REST + BinaryCIF | Fetch by ID; Mol* loads natively |
| Structures (predicted) + confidence | AlphaFold DB | Per-UniProt mmCIF + pLDDT/PAE |
| Sequence + function annotation | UniProt REST | For copilot context |
| Domains/families | InterPro / Pfam (optional) | For `highlight_domain` |
| Star-map coordinates | **Precomputed offline, committed** | Curated subset; UMAP/PCA to 3D |
| **Design trajectories + scores** | **RFdiffusion → ProteinMPNN → Boltz-2, offline** | **Per-step coords + sequence + score, committed as JSON** |
| Reasoning + tool-use | **GPT-5.6 via Responses API** | Streaming, typed tools |
| The build itself | **Codex** | Per hackathon requirement |

**Curate the subset and the designs deliberately.** Star-map: ~1–5k proteins that are visually diverse, include famous/relatable ones (hemoglobin, GFP, insulin, EGFR, a CRISPR protein, a virus spike), and cluster into recognizable neighborhoods. Designs: pick 3–5 target sites that are (a) on famous proteins users will dive into, (b) visually clean interfaces, and (c) produce designs with genuinely good scores — pre-select the best RFdiffusion outputs so the reveal always lands.

## 11. Risks & mitigations (hackathon-specific)

- **Scope creep → the killer.** Mitigation: §4 guardrails; build in milestone order; the two gasps are sacred, everything else is cuttable.
- **The pre-compute doesn't finish in time.** Mitigation: it's Milestone -1, off the critical path, started first; if RFdiffusion access is slow, a smaller/simpler target site still produces a real trajectory. Have at least one design baked before touching polish.
- **GPT-5.6 latency hurts the demo.** Mitigation: stream reasoning immediately; compact context; pre-warm; tune reasoning effort for interactive feel; pre-record the demo with a good run.
- **Copilot hallucinates structure or overstates a design.** Mitigation: strict grounding in the context object; the honesty rule (§6.4); designs explicitly labeled pre-computed and predicted-not-validated. A model that says "predicted, not proven" scores *better*.
- **"It's just a viewer."** Mitigation: this is not a viewer — it *creates proteins*. Lead the video with the reasoning and design, not the viewer.
- **"The generation is faked."** Mitigation: it isn't — the trajectory is real RFdiffusion output, pre-computed. Say so plainly in the README and video. Pre-computed ≠ fake; live ≠ required.
- **Both Codex AND GPT-5.6 must be visibly used.** Mitigation: build with Codex (document with session evidence per rules); GPT-5.6 is the copilot core including `design_binder`. Make both obvious in the writeup.

## 12. Submission checklist (from the rules)

- [ ] Public code repo with README + getting-started + how GPT-5.6/Codex are used + **how designs were pre-computed** (RFdiffusion/MPNN/Boltz, with the honesty note).
- [ ] Working hosted demo (free, no login) available through judging period.
- [ ] <3-minute YouTube video showing it functioning (build to §8; climax on the design).
- [ ] Chosen track(s) + short rationale. **Recommend: Best Overall, with For Humanity and Wildcard as secondary** (multiple category eligibility is allowed).
- [ ] English throughout.
- [ ] Evidence of Codex use during the window (session/commit history).
- [ ] Only work done in the window counts — this is new, so fine.

## 13. The positioning line (for the submission + video)

> **Helicase Atlas turns the entire known protein universe into a place you can fly through — and gives it a voice that can create. Powered by GPT-5.6's reasoning over real molecular structure, it lets anyone explore 200 million proteins the way we explore the night sky, then design a brand-new protein just by describing it — and watch it fold into being. Built with Codex.**

---

### Appendix — How this connects to the bigger Helicase vision
Atlas is the highest-wattage *slice* of the full Helicase founding vision (see the founding dossier): Pillar 3 (interactive visualization / "night sky"), Pillar 4 (delight through interaction), a taste of the reasoning layer, and a real sliver of Pillar 1's design lifecycle (the generative loop). Winning Build Week with Atlas is the wedge — it proves the experience thesis publicly, builds the visualization engine + SceneController + copilot-tool pattern + the design-reveal choreography that the full platform needs, and creates the demo that recruits collaborators. The full design workflows (arbitrary targets, live generation, multi-objective steering), the project graph, and the closed-loop wet-lab flywheel come later. Do not build them now. The MVP's job is one universe, a few real designs, and two gasps that judges cannot unsee.
