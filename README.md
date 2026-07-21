# Helicase Atlas

Helicase Atlas is a browser-native scientific instrument for navigating a spatial protein universe, inspecting sourced molecular structures, making predicted-structure confidence visible, and letting GPT-5.6 control the scene through validated tools.

## What works

- A progressively streamed 75,000-protein GPU field derived from 575,503 reviewed UniProt records.
- Complete reviewed-corpus server search with query-driven materialization into stable Atlas addresses.
- Damped orbit, truck, pointer-centred dolly, keyboard navigation, semantic zoom, camera history, home/reset, interruption, and spatial-context restoration.
- Deferred Mol* inspection of experimental RCSB and predicted AlphaFold structures.
- Verified AlphaFold per-residue pLDDT Confidence X-Ray, unavailable by design for experimental PDB entries.
- RCSB/SIFTS chain and UniProt residue-coverage metadata for experimental structures.
- Cartoon, molecular-surface, ball-and-stick, ligand, and residue-range focus controls behind the structure adapter.
- An attributable precomputed ProteinMPNN sequence-redesign journey for UniProt A5F934 / PDB 6EHB. It stops before unsupported structure, affinity, or wet-lab validation claims.
- `design_binder` maps an eligible request to that imported artifact; it never generates a sequence or claims binding. The player supports play, pause, scrub, step, comparison, provenance inspection, and return to source context.
- `design_binder` maps an eligible request to that imported artifact; it never generates a sequence or claims binding. The player supports play, pause, scrub, step, comparison, provenance inspection, and return to source context.
- Streamed GPT-5.6 Responses API integration with strict runtime-validated scene tools and an explicit offline fallback.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Add `OPENAI_API_KEY` to `.env.local` for the credentialed copilot. Without it, Atlas clearly identifies the local command fallback; search, structures, confidence, design evidence, and navigation remain functional.

## Validate

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Scientific boundaries

- Atlas proximity currently encodes a deterministic UniProt annotation-family hierarchy, not measured sequence or structural similarity.
- The 75,000-protein browser profile is staged delivery, not complete indexed coverage; all 575,503 reviewed records remain query-addressable.
- pLDDT is local confidence for an AlphaFold prediction, not experimental accuracy.
- ProteinMPNN scores estimate sequence compatibility with a backbone. They are not binding affinity, efficacy, or experimental validation.
- RCSB/SIFTS coverage may omit unresolved, engineered, inserted, non-UniProt, or ligand residues.

## Architecture and operations

Start with [AGENTS.md](AGENTS.md), the [canonical dossier](docs/Helicase_Atlas_BuildWeek_Dossier.md), [architecture](docs/architecture/ARCHITECTURE.md), [UI integration contract](docs/design/UI_INTEGRATION_CONTRACT.md), and [deployment guide](docs/engineering/DEPLOYMENT.md). The [completion audit](docs/planning/PRODUCT_COMPLETION_AUDIT.md) records evidence and remaining external blockers.

Canonical logo sources remain under `logo/`; unmodified web derivatives live under `public/brand/logo/`.
