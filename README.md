# Helicase Atlas

Helicase Atlas is a browser-native instrument for exploring protein space as a navigable night sky, making uncertainty visible, and using GPT-5.6 to reason over and pilot the scene.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `OPENAI_API_KEY` to enable the server-side Responses API route. Without it, the copilot uses an explicitly labelled local interaction fallback so the scene remains demonstrable.

## Current implementation

- Cinematic loading sequence, staged density field, cited-structure transition, and interruption path.
- Strict domain commands shared by direct controls and the copilot route.
- Canonical brand assets are derived into `public/brand/logo/` without modification.
- A client-only Mol* adapter loads the cited RCSB BinaryCIF structure for PDB 1EMA. This experimental structure has no pLDDT confidence, so Confidence X-Ray remains unavailable until a verified predicted fixture is imported.
- The current design reveal is a clearly marked choreography fixture. It is **not** a scientific result; it will be replaced only by verified offline RFdiffusion → ProteinMPNN → Boltz-2 trajectory data with provenance and predicted-not-validated scores.

## Architecture

The product and engineering constitution remains under [`docs/`](docs/). Start with the [canonical MVP dossier](docs/product/Helicase_Atlas_BuildWeek_Dossier.md), then [architecture](docs/architecture/ARCHITECTURE.md) and [design system](docs/design/DESIGN_SYSTEM.md).

## Start here

- [Vision](VISION.md)
- [Product theory](PRODUCT_THEORY.md)
- [Architecture](ARCHITECTURE.md)
- [System overview](SYSTEM_OVERVIEW.md)
- [Design principles](DESIGN_PRINCIPLES.md)
- [Build plan](BUILD_PLAN.md)
- [Canonical MVP dossier](docs/Helicase_Atlas_BuildWeek_Dossier.md)

## Current status

The first runnable Atlas slice is now implemented. The density field and design choreography remain explicitly labelled fixtures until verified atlas data is imported.

## Product thesis

Helicase should make computational biology feel spatial, alive, and intellectually honest. A user should be able to move from a universe-scale view to a residue-level question, ask GPT-5.6 to investigate, and see the answer expressed through the scene rather than only through prose.

## Future implementation direction

The current direction is Next.js, React, TypeScript, Three.js, Mol*, a thin server boundary, curated scientific fixtures, and a small typed GPT tool surface. These are architectural defaults, not excuses to preserve a weak decision.

## Contribution

Read [CONTRIBUTING.md](CONTRIBUTING.md), [PRINCIPLES.md](PRINCIPLES.md), and [ENGINEERING_PRINCIPLES.md](ENGINEERING_PRINCIPLES.md) before changing the project.
