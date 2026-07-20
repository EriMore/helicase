# Sound Spec

Sound is **off by default** (`state.sound:false`) and is a deliberate, minimal, parameterized Web Audio layer — not sample playback. It exists to give tactile confirmation to key transitions, never as ambience or music.

## Engine

Single shared `AudioContext` (created lazily on first toggle-on, `initAudio()`), one oscillator+gain node pair spun up per cue and disposed after playback. No persistent nodes, no loops.

## Cue table

| Cue | Trigger | Frequency | Waveform |
|---|---|---|---|
| `select` | Protein selection | **520 Hz** | sine |
| `enter` | Enter territory / enter structure inspect / start design | **340 Hz** | sine |
| `query` | Deterministic query match | **440 Hz** | sine |
| `back` | Any return/back navigation | **300 Hz** | sine |
| `tick` | Minor toggles: representation change, color-mode change, confidence toggle, ligand toggle, thread toggle, double-click focus | **660 Hz** | sine |
| `deny` | Invalid action (e.g. click on empty field, query miss) | **180 Hz** | sine |

## Envelope (identical shape for every cue, only frequency changes)

- Gain starts at **0.0001** (effectively silent, avoids click/pop).
- Exponential ramp **up to 0.045** over the first **10ms**.
- Exponential ramp **down to 0.0001** by **280ms**.
- Oscillator stops at **300ms**.

This is a short, soft "tick/chime" envelope — not a sustained tone. No cue overlaps in practice because each is tied to a discrete, debounced user action.

## Consent & persistence

- Sound requires an explicit opt-in via the header toggle (`SOUND ○` → `SOUND ●`). Never plays before the user has turned it on.
- **Not currently persisted** across reloads in the prototype (no `localStorage` write) — state resets to off on every load. Production should persist this preference (see `IMPLEMENTATION_NOTES.md`).
- Muting is a simple state flag checked at the top of `playCue()` — no fade-out of in-flight sound needed since cues are always ≤300ms.

## What does NOT have sound

Ambient orbit, camera drag/pan/zoom (continuous input), panel scroll, sequence scrolling/selection, hover states, theme toggle, text input. Sound is reserved for discrete, meaningful state transitions only — this restraint is intentional and should not be expanded without a specific design reason.
