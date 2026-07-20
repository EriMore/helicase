# Deployment and Environment

## Runtime

Helicase Atlas is a Next.js application with static Atlas shards and dynamic server routes for complete-corpus UniProt search, RCSB/SIFTS metadata, AlphaFold confidence, and the OpenAI Responses API. Deploy to a Node-compatible Next.js host; static-only export is not supported.

## Environment

Copy `.env.example` to `.env.local` for local development. `OPENAI_API_KEY` is optional and must remain server-only. Without it, `/api/copilot` returns the explicit `local-explicit` stream and the scientific instrument remains usable. `OPENAI_MODEL` defaults to `gpt-5.6`.

Never prefix secrets with `NEXT_PUBLIC_`. Never commit `.env.local`.

## External services

- UniProt REST: complete reviewed-corpus query and release metadata.
- RCSB Data/Model services: experimental structure metadata, SIFTS coverage, and BinaryCIF coordinates.
- AlphaFold DB: predicted coordinates, pLDDT and optional PAE artifact references.
- OpenAI Responses API: credentialed streamed copilot.

All adapters expose recoverable failure states. Browser-host egress must allow `models.rcsb.org` and `alphafold.ebi.ac.uk`; server egress must additionally allow UniProt, RCSB Data, AlphaFold metadata, and `api.openai.com`.

## Production checks

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm start
```

Validate the complete journey at 1440 x 900. Confirm security headers, no browser console errors, no client exposure of `OPENAI_API_KEY`, and explicit offline behavior when the key is absent.

## Data profile

The deployed browser field contains 75,000 progressively loaded proteins. The complete reviewed corpus remains addressable through `/api/atlas/search`; the UI must not call the staged field the complete corpus. Static Atlas artifacts are release-bearing and should be replaced atomically when regenerated.

## Rollback

Application releases are immutable. Roll back the application and its matching `public/data/atlas/manifest.json` plus shards together; mixing spatial schema or release versions is unsupported.
