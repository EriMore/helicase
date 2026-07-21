# Final Acceptance Matrix

Every checklist item in `docs/design/final/VISUAL_ACCEPTANCE_CRITERIA.md`, mapped to implementation location, data source, test, visual evidence, and current completion status. Status legend: **Pass** (verifiable now), **Partial** (real substance, incomplete presentation), **Fail** (not implemented), **N/A-yet** (blocked on a not-yet-built prerequisite).

## Brand & logo

| Criterion | Implementation location | Data source | Test | Visual evidence | Status |
|---|---|---|---|---|---|
| Logo renders exactly once per screen context | `AtlasExperience.tsx:214` (masthead), `:319` (loader) | `public/brand/logo/*.svg` | None automated | Not captured this session (documentation-only audit; no browser QA performed) | Partial — no duplication observed by code inspection, unverified visually |
| Correct canonical asset per theme, no CSS-filter recoloring | Only `icon_white_svg.svg`/`logo_full_white_svg.svg` are referenced; no theme-conditional asset swap exists because no theme system exists | `public/brand/logo/` (black + white variants present on disk, per `docs/design/final/manifest.json` parity list — need to confirm production copies both variants) | None | — | Fail (no light-mode asset wired) |
| Logo never rotates/spins/pulses | `globals.css:31` `@keyframes breath` applies `filter:drop-shadow` + `transform:scale(1.07)` to `.loader img`, not rotation; no spin exists | — | None | — | Pass (the "breath" pulse is a scale+glow, not spin — but is a form of continuous motion the design doesn't specify; recommend removing during the loading restyle for full literal compliance) |

## Color discipline

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Light mode is flagship/primary | — | — | — | — | Fail — no light mode exists |
| Teal appears only as a rare signal | `globals.css` uses `--signal-trust:#78d8ff` (cyan-blue, not the design's `#0c8c78`/`#34d6b8` teal) pervasively for chrome (live-dot, focus states, copilot orb) | — | None | — | Fail — current accent system predates the design tokens entirely |
| Territory palette + evidence/confidence/thread colors match `DESIGN_TOKENS.md` exactly | `WorldCanvas.tsx:25-30` `palette` object: 12 hand-picked hues for 12 semantic regions, none matching the design's 6-value territory palette | — | None | — | Fail — reconciliation required per roadmap item 5 |

## Navigation & camera

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Orbit/pan/zoom-to-pointer/double-click-focus match spec constants | `src/engine/camera-navigation.ts` (`orbit`, `truck`, `dolly`); double-click focus **not implemented** | — | `src/engine/camera-navigation.test.ts` (2 tests: home/reset behavior) | — | Partial — 3 of 4 behaviors exist with divergent constants; double-click focus absent |
| Ambient orbit only in Universe/Territory, pauses on input, resumes after exact idle window | `WorldCanvas.tsx:359-361` runs unconditionally every frame, not idle-gated | — | None | — | Fail |
| Every Depth Rail level above current is clickable, restores exact prior framing | No Depth Rail component exists | — | None | — | Fail |
| `Esc` returns one level; home/logo returns to Universe | `Escape` currently calls `navigator.cancel()` (cancels in-flight tween) not a level-return; `Home` key calls `navigator.home()`; logo click has no `onClick` handler in `AtlasExperience.tsx:214` | — | None | — | Fail |

## Density & scale honesty

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Universe visibly implies thousands of points/territory, dense-but-breathable | `WorldCanvas.tsx` renders the full loaded `proteins` buffer (up to 75,000) as one instanced field, not grouped/breathable by territory | `public/data/atlas/manifest.json` (real, 75,000 records, 19,451 clusters) | None | Real data volume confirmed by manifest inspection | Partial — real scale, presentation not territory-authored |
| UI copy honestly states 75,000 delivery vs 575,503 full corpus, never conflated | `AtlasExperience.tsx:193` `coverageLabel` states both numbers distinctly | `atlas.manifest.coverage.records` (75,000) + `atlas.addressableCount` (575,503 default, updated from live search `totalResults`) | `src/domain/schemas.test.ts` validates schema shapes, not copy text | Verified by direct code reading | **Pass** |
| No territory/cluster reads as flat/sparse placeholder | Real per-family hashed placement (`spatializeProtein`), not placeholder | `spatialization.ts` | None visual | Not visually verified this session | Partial |

## Identity & disclosure

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Glance/Learn/Inspect three-tier disclosure present, in order | Only Inspect (structure) and a single flat identity card exist; no Glance/Learn tab split | — | None | — | Fail |
| Every claim traceable to a citation/source | `specimen-card` shows `UniProt {id} · {source} {accession}` citation line for the fields it does show | `AtlasProtein` (real UniProt-sourced fields only: organism, family, length, structure reference) | None | Verified by code reading — no invented fields present | **Pass** for the fields that exist; **N/A-yet** for fields (pathway/disease/homologues) that don't exist yet |
| Unknown fields shown as explicitly unknown, never placeholder-backfilled | No placeholder generation found anywhere in `atlas.ts`/`atlas-data.ts`/`spatialization.ts` — confirmed absence of any `decorate()`/seeded-random domain generator in production code (that pattern exists only in the *prototype*, which is reference-only and not imported) | — | None | Verified by code reading | **Pass** (production has correctly not imported the prototype's placeholder generators) |

## Sequence

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Real one-letter sequences render at readable scale with working range selection | No component exists | No sequence field fetched anywhere | None | — | Fail |
| Residue-range selection bidirectional with 3D | `StructureView.tsx` already implements the 3D-side half (`focusRange` prop → MolScript query → `camera.focusLoci`) — the sequence-side half doesn't exist to complete the loop | — | None | — | Fail (half the mechanism exists and is real) |
| Virtualized/domain-overview presentation for titin-scale proteins | Not implemented | — | None | — | Fail |

## Relationship threads

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| ≤3 curated threads, off by default, user-revealed | No UI | `explainProximity()` exists (`spatialization.ts:57`) but is never called | None | — | Fail (data function exists, unwired) |
| Each thread states type/strength/source/basis | N/A — no UI | `explainProximity()` returns `{signals:[{kind,label,source}], caveat}` — has kind/label/source but no strength/status field yet | None | — | Fail |
| Threads visually subordinate, thin, non-dominant | N/A | — | — | — | Fail |

## Structure & confidence

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Representation switching works without full panel reload | `StructureView.tsx:122-127` calls Mol* `representation.addRepresentation` on prop change within the same mounted plugin instance | Real Mol* API | None automated | Verified by code reading (no full remount on representation change alone — `useEffect` dependency array includes `representation` but reruns the whole init function, which **does** remount the plugin fully; see next line) | **Partial** — actually re-running `initialize()` on every representation change (dependency array line 152 includes `representation`) means each toggle currently **does** tear down and rebuild the entire Mol* plugin, not just swap the representation. This is more expensive than necessary and should be split into a lighter update path in the restyle pass |
| Confidence X-Ray only for predicted, experimental shows method+resolution instead | `useStructureConfidence.ts:14`, `xray-trigger` disabled logic in `AtlasExperience.tsx:276` | Real AlphaFold DB API (`/api/structure/confidence`) | None | Verified by code reading — gate is unconditional and correct | **Pass** |
| Confidence coloring uses defined 4-stop gradient + visible legend | Mol*'s built-in `QualityAssessmentPLDDTPreset` applies the standard AlphaFold blue→orange convention (verify exact stop values match `DESIGN_TOKENS.md`'s `#e8622a→#e8a93a→#5fc7d6→#2e6fe0`); no separate legend UI rendered, only prose ranges | Real pLDDT data | None | — | Partial — coloring is real and likely close to standard AlphaFold convention but not confirmed pixel-matched to the design's exact 4 hex stops; legend chrome absent |

## Protein design journey

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Staged and explicitly labeled at every stage, never a bare spinner | `AtlasExperience.tsx:293-307` `design-hud` shows stage label/description/pipeline dots for all 3 real stages | `public/data/design/proteinmpnn-6ehb.json` (real) | `src/domain/atlas.test.ts` (design journey reducer coverage) | Real, evidence-carrying JSON confirmed by direct read | **Pass** for the 3 real stages; **N/A-yet** for design stages 4–9 which must render as evidence gates, not be invented |
| Every design screen carries a visible precomputed/no-validation disclaimer | `stage.provenance.limitations[0]` rendered in the `<small>` footer of the design panel | Real, per-stage provenance in the JSON | `src/domain/schemas.test.ts` validates `designTrajectorySchema` shape including `precomputed: true` literal | Verified | **Pass** |
| No fake progress bars/shimmer/sparkle | `.progress i` width is a real `(stageIndex+1)/stages.length` ratio, not a fake animated bar | — | None | Verified by code reading | **Pass** |

## Query vs. Ask Atlas

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Visually and behaviorally distinct entry points/response shapes | `atlas-query` (count+filter) vs `copilot` (prose+tool-call) are separate components with separate state | Real (`useProteinAtlas.search` vs `/api/copilot`) | None | Verified by code reading | **Pass** on distinctness; visual styling not yet matched to design |
| Ask Atlas shows visible action trace for every scene-affecting answer | Tool calls apply silently via `applyTool()`; no trace is rendered to the user anywhere in `AtlasExperience.tsx` | — | None | — | Fail |
| Ask Atlas summonable and dismissible, never permanently docked | Permanently mounted `<section className="copilot">`, only opacity-fades on landing (`copilot-dormant`) | — | None | — | Fail |

## Accessibility & robustness

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Visible focus states, keyboard reachability | `globals.css:77` `:focus-visible{outline:1px solid var(--signal-trust)}` applies globally to `button,input,[tabindex]` | — | None | Verified by code reading | **Pass** for existing controls; must extend to every new panel as built |
| Reduced-motion disables drift, snaps tweens, doesn't break transitions | `WorldCanvas.tsx:191` reads `prefers-reduced-motion` into `CameraNavigation.reducedMotion`; `CameraNavigation.update()` forces `factor=1` when set (instant snap, matches spec); `globals.css:33,78` also has a CSS-level reduced-motion block | Real media query, correctly wired | None automated | Verified by code reading | **Pass** — mechanism is correct; ambient-orbit gating bug (§ Navigation table) means "disables drift" is not fully honored yet since drift currently runs unconditionally regardless of mode, though it *is* still gated by `reducedMotion` |
| Text legible over point field at any camera angle (scrims/vignette) | `.atmosphere` in `globals.css:10` provides a radial+linear darkening gradient — a real but different mechanism from the design's dedicated top/bottom scrim strips | — | None | — | Partial |
| No critical control fails hit-target/contrast scrutiny | Not audited this session (no browser QA performed) | — | None | — | N/A-yet |

## Light + dark parity

| Criterion | Location | Data source | Test | Evidence | Status |
|---|---|---|---|---|---|
| Every `SCREEN_STATE_MATRIX.md` state checked in both themes | Not possible yet — light mode doesn't exist | — | None | — | Fail |
