# Design trajectory architecture

Helicase reveals attributable, precomputed design evidence through the existing SceneController boundary. `design_binder` is an eligibility mapper, not a sequence generator: it resolves a request to `proteinmpnn-6ehb-example-6` only when the selected target is UniProt A5F934 / experimental PDB 6EHB.

The public run is coherent from target structure to ProteinMPNN candidates. It does not contain RFdiffusion frames, predicted candidate structures, interface metrics, confidence values, or wet-lab validation. Those stages remain explicit evidence-gate states and are never visually implied as completed.

Playback is paused by default, can play, pause, restart, step, scrub, compare candidates, or return to the source structure. Stage timing is a presentation affordance for inspecting imported artifacts, not a claim about compute time. The player never interpolates absent coordinates or labels a prediction as experimentally validated.

The fixture records source URLs, repository path, method, version/commit, input and output identities, license, timestamp and limitations at trajectory, stage and candidate level. The source is the official [ProteinMPNN example 6 output](https://github.com/dauparas/ProteinMPNN/tree/main/outputs/example_6_outputs) for PDB [6EHB](https://www.rcsb.org/structure/6EHB), imported at `public/data/design/proteinmpnn-6ehb.json`.
