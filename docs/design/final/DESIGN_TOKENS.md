# Design Tokens

All styling in the prototype is inline (per DC authoring convention) driven by a semantic token set computed per theme in `renderVals()`/`rootStyle`. This document is the canonical extraction. Production should implement these as real CSS custom properties or a theme object — the values below are the contract, not the mechanism.

## Color — semantic (light is flagship, dark equally authored)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#efece4` | `#0d1013` | page background / far fog color |
| `--ink` | `#22262b` | `#e9e7e0` | primary text, headings |
| `--ink-soft` | `#5c6169` | `#a2a6ab` | secondary labels, tab inactive |
| `--ink-faint` | `#948b7d` | `#6a6f75` | metadata, hints, faint labels |
| `--teal` | `#0c8c78` | `#34d6b8` | **signal only** — selection, active state, current depth-rail level, design accent |
| `--glass` | `rgba(243,241,234,.72)` | `rgba(17,20,24,.66)` | panel fill under backdrop-blur |
| `--glass-brd` | derived from ink at low alpha | derived from ink at low alpha | panel hairline border |
| `--line` | derived hairline | derived hairline | internal row dividers (rows, domain lists) |
| `--on-accent` | near-white | near-black | text on solid `--ink` buttons (Inspect CTA) |
| `--scrim-top` / `--scrim-bot` | warm-tinted gradient to transparent | dark-tinted gradient to transparent | occlusion scrims, top 150px / bottom 120px |
| `--vignette` | subtle radial darken | subtle radial darken | full-viewport, non-interactive |

**Rule:** teal must never exceed a rare-accent share of any screen's visual weight. If a screen reads as "teal-dominant," it has drifted from spec.

## Territory palette (6 families, same hue mapping both themes — dark variants lightened for legibility against `#0d1013`)

`#3c5a86` (blue) · `#8f4a44` (brick) · `#3f6f60` (green) · `#9a7a34` (ochre) · `#6a4a70` (plum) · `#4a4f57` (slate)

## Evidence / confidence / relationship colors (theme-invariant signal colors)

- Evidence: **experimental** = teal square marker · **predicted** = amber circle marker, `#c9922f`
- Confidence scale (pLDDT low→high): `#e8622a → #e8a93a → #5fc7d6 → #2e6fe0`
- Relationship thread types: complex `#0c8c78` (teal) · interaction `#5a7fb5` · homology `#b07b3a` · process `#7a6a9c`

## Point-field / scene tokens (per theme, `THEMES` object)

| Token | Light | Dark |
|---|---|---|
| fog color | `#efece4` | `#0d1013` |
| fog near / far | 300 / 1200 | (theme-specific, same order of magnitude) |
| point base size | 22 | theme-specific |
| blending | normal | **additive** (dark mode points glow; light mode stays matte/inked) |
| non-focused dim factor (`dimNon`) | 0.30 | theme-specific |

Halo (non-family) points tint toward `#8a8578` (light) / a cool dark neutral (dark) at 60% lerp — they read as ambient field, never as data.

## Typography

- **Spectral** (serif, italic available) — editorial voice: protein names (30px/1.1, -.01em), organism (14px italic), sourced facts, domain labels (13px), reference citations (12.5px italic), Learn-tab prose rows (13.5px/1.5).
- **IBM Plex Mono** — everything structural/identifying: accession IDs, gene symbols, section labels (9–10.5px, letter-spacing .14–.28em, uppercase), metrics, sequence residues, depth-rail labels, button labels.
- No default sans-serif UI font anywhere in the design surface (body fallback stack exists only as a pre-font-load safety net).
- Base UI label size floor: **8px** (rail sub-hints) — used sparingly, always paired with a larger anchor label; never the primary reading size for any panel.

## Spacing & grid (viewport-anchored panel positions, 1920×1080 reference)

- Outer margin: **26px** on all sides (header, depth rail, sequence bar, Ask Atlas entry point).
- Header: `top:18px`, height 46px, split into a left brand cluster and a right status/theme/sound cluster.
- Depth Rail: fixed left `26px`, vertically centered, column layout, `gap:2px` between levels.
- Query bar: top-centered, `top:78px`, width `min(660px, 66vw)`.
- Identity panel (Glance/Learn): `left:201px` (clears the rail), `top:76px`, width `min(380px, 34vw)`, max-height `calc(100vh - 180px)`, internal scroll.
- Inspect/Design panel: `right:26px`, `top:88px`, width `min(300–340px, 28–32vw)`.
- Sequence bar: full-width strip pinned `left:26px right:26px bottom:26px`.
- Ask Atlas entry + trace panel: bottom-right button → top-centered panel on activation, `width:min(560px,64vw)`.
- Panel radius: **2–3px** throughout — deliberately minimal, not a rounded-card system.
- Glass treatment: `backdrop-filter: blur(16px) saturate(1.2)` + `--glass` fill + 1px `--glass-brd` edge on every persistent panel.

## Grid discipline

There is no visible column grid — layout is anchored panels over a full-bleed 3D canvas, not a document grid. Panel widths are viewport-relative (`min(px, vw)`) so they scale down gracefully on narrower viewports without ever exceeding a comfortable reading measure.
