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
- An attributable precomputed ProteinMPNN sequence-redesign journey for UniProt A5F934 / PDB 6EHB, played as a continuous, scrubbable 6-beat timeline (play/pause, seek, per-beat jump, candidate comparison with a real sequence diff) rather than a click-through wizard. It stops before unsupported structure, affinity, or wet-lab validation claims.
- Streamed GPT-5.6 Responses API integration with strict runtime-validated scene tools and an explicit offline fallback.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. For the credentialed Ask Atlas copilot, put a real key in `.env.local`:

```text
OPENAI_API_KEY=<your key>
```

`OPENAI_API_KEY` is read server-side only (`app/api/copilot/route.ts`) — it is never a `NEXT_PUBLIC_` variable and never reaches client-side code. Without it (or if the OpenAI request genuinely fails), Ask Atlas shows the explicit local-command-fallback message ("The credentialed reasoning service is unavailable…") rather than silently pretending to be GPT-5.6; search, structures, confidence, design evidence, and navigation all remain fully functional either way.

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
