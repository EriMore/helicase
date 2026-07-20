# Helicase Atlas — Design Handoff Package

This package is the complete, final design target for the Helicase Protein Universe Explorer ("The Illuminated Plate" direction). It is prepared for implementation by engineering (Claude Code) against the existing production repository (real 575,503-protein corpus, Mol* renderer, search engine, UniProt pipeline).

**This package does not touch the production repository.** It is a self-contained reference: inspect it, run it, measure it, then reimplement its interface against real data and services.

## What's in here

```
handoff/
├── README.md                          — this file
├── DESIGN_TARGET.md                   — what this is, what "done" means, non-goals
├── UI_INTEGRATION_HANDOFF.md           — interaction → SceneController map (source of truth for behavior)
├── COMPONENT_INVENTORY.md              — every authored UI component, its states and props
├── DESIGN_TOKENS.md                   — colour, type, spacing, grid — light + dark
├── MOTION_AND_CAMERA_SPEC.md           — every animation/camera constant, easing, timing
├── SOUND_SPEC.md                       — every sound event, frequency, envelope
├── SCREEN_STATE_MATRIX.md              — full state-transition map, all named states
├── SCIENTIFIC_DATA_BOUNDARIES.md       — fixture vs. production data — READ FIRST if you touch data
├── VISUAL_ACCEPTANCE_CRITERIA.md       — the checklist production must pass
├── IMPLEMENTATION_NOTES.md             — practical guidance for the engineering pass
├── manifest.json                       — machine-readable index of every file + asset + screenshot
├── prototype/
│   ├── Helicase Atlas.dc.html          — complete prototype source, unmodified
│   ├── support.js                      — DC runtime helper (unmodified)
│   └── assets/
│       ├── helicase-mark-black.png     — logo mark, light mode (used)
│       ├── helicase-mark-white.png     — logo mark, dark mode (used)
│       ├── word-black.png              — wordmark, light mode (used)
│       ├── word-white.png              — wordmark, dark mode (used)
│       └── unused/                     — two additional logo lockups shipped with the source
│           ├── helicase-wordmark-black.png   — not referenced by the prototype; kept for parity
│           └── helicase-wordmark-white.png   — not referenced by the prototype; kept for parity
└── screenshots/
    ├── 01–16-frame.png                 — captured states, see INDEX below
    └── INDEX.md                        — what each numbered screenshot shows
```

## How to run and inspect the prototype

The prototype is a **Design Component** (`.dc.html`) — a single HTML file with an inline React-like template/logic split, not a bundled app. To inspect it:

1. Open `prototype/Helicase Atlas.dc.html` directly in a design-component-aware host (the environment this was authored in), or in any static file server — it has no build step and no server-side dependency. All assets are relative (`assets/...`), so keep the folder structure intact.
2. The component exposes its live instance at `window.__heli` once mounted (see `componentDidMount`). Use the browser console to jump states directly for inspection, e.g.:
   - `window.__heli.selectHero(window.__heli.HEROES[0])` — select the first fixture protein
   - `window.__heli.enterTerritory(0)` — enter the first territory
   - `window.__heli.onInspect()` — open structure inspection
   - `window.__heli.onToggleTheme()` — swap light/dark
   - `window.__heli.HEROES` — the full fixture protein array (7 illustrative entries)
3. All interactive controls (query bar, depth rail, representation buttons, Ask Atlas) are reachable by mouse/keyboard with no hidden setup — see `SCREEN_STATE_MATRIX.md` for the full reachability map.
4. Camera: left-drag orbits, right/middle/shift-drag pans, wheel zooms toward the pointer (ctrl+wheel = pinch), double-click focuses. Ambient orbit resumes after 3.5s idle in Universe/Territory views.

No API keys, no network calls, no external services are required to run it. Google Fonts (Spectral, IBM Plex Mono) and three.js load from public CDNs at runtime — see `IMPLEMENTATION_NOTES.md` for production substitution guidance.

## Reading order for engineering

1. `SCIENTIFIC_DATA_BOUNDARIES.md` — understand what's real vs. illustrative before touching anything.
2. `DESIGN_TARGET.md` — the intent and non-goals.
3. `UI_INTEGRATION_HANDOFF.md` — the interaction contract.
4. `COMPONENT_INVENTORY.md`, `DESIGN_TOKENS.md`, `MOTION_AND_CAMERA_SPEC.md`, `SOUND_SPEC.md` — the implementation detail behind that contract.
5. `SCREEN_STATE_MATRIX.md` — verify every state is accounted for.
6. `VISUAL_ACCEPTANCE_CRITERIA.md` — what to check the production build against.
7. `IMPLEMENTATION_NOTES.md` — practical substitution guidance (data, Mol*, GPT, camera library).

This package is a plain folder of Markdown, JSON, HTML, and PNG — safe to commit unchanged to a Git repository.
