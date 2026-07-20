# Motion & Camera Spec

Every timing, easing, and camera constant that governs the prototype's feel. Production may swap the camera *implementation* (e.g. to `camera-controls`/Drei `CameraControls`) but must preserve every value below — this is what makes the navigation feel "weighty and accurate," per the design brief.

## Easing

Single easing curve used everywhere motion is tweened — **easeInOutCubic**:
```
ease(t) = t < 0.5 ? 4·t³ : 1 − (−2t + 2)³ / 2
```
No other easing curve is used in the prototype. Do not substitute a generic `ease-in-out` CSS keyword — the cubic shape is specifically softer at the endpoints than standard easing.

## Camera model

Spherical orbit camera: `{ tgt: Vector3, r, theta, phi }`. Perspective, **FOV 46°**, near 1 / far 9000.
- `theta` — azimuth, driven by horizontal drag (`×0.0045` rad/px)
- `phi` — polar angle, clamped **[0.14, 3.0]** rad, driven by vertical drag (`×0.0045` rad/px)
- `r` — radius/distance, clamped **[40, 1700]**
- A **critically-damped follow** (`now` lerps toward `cam` at k≈0.09/frame) sits under all discrete tweens, so even a snapped/tweened target arrives with a small amount of natural settle.

## Direct manipulation (always live, never blocked by a tween in progress for orbit/pan)

| Input | Behavior | Constant |
|---|---|---|
| Left-drag | Orbit (theta/phi) | 0.0045 rad per px |
| Right-drag / middle-drag / shift-drag | Pan (truck), speed scales with current `r` | `doPan(dx,dy)` |
| Wheel | Zoom **toward pointer** | factor `1 ± (ctrlKey ? 0.05 : 0.09)`; ctrl+wheel = pinch-equivalent finer step; `r` clamped 40–1700; target lerps toward the point under the cursor (0.16 zooming in / −0.10 zooming out) |
| Double-click | Focus: recenters target on clicked point, `r → max(160, r×0.6)` | plays `tick` cue |
| Any pointer input | Cancels ambient orbit immediately, marks `lastAct` | — |

## Ambient orbit

- Only active in **Universe** and **Territory** views.
- Resumes after **3500ms** of no input.
- Drift rate: **theta += 0.00022 rad/frame** (~60fps → ≈0.0132 rad/s — deliberately slow, contemplative, never distracting).
- Fully disabled under reduced motion.

## Scene-tween durations (camera `applySnap`, all easeInOutCubic)

| Transition | Duration | Notes |
|---|---|---|
| Select protein (universe/territory → glance) | **1600ms** | `r → 150`, continuous fly, no cut |
| Enter territory | **1500ms** camera / **1400ms** point-field reflow (parallel, not sequential) | `r → 260`, `phi → 1.05` |
| Inspect structure (glance → inspect) | **1500ms** | `r → 90`, `theta += 0.5`, `phi → 1.02` |
| Start design (glance/inspect → design) | **1400ms** | `r → 100`, `theta += 0.4`, `phi → 1.0` |
| Return: inspect → glance | **1300ms** | restores exact saved `levelCam.protein` snapshot |
| Return: glance → territory | **1300ms** | restores exact saved `levelCam.territory` snapshot |
| Return: any → universe (`onHome`/full return) | **1500ms** camera / **1300ms** reflow | restores exact saved `levelCam.universe`, or a default `{r:640, phi:1.12}` framing if none saved |
| Deterministic query match | **1500ms** camera / **1500ms** reflow | frames matched family at `r:380` |
| Clear query | **1300ms** | returns to a neutral wide framing, `r:600` |
| Default (unspecified `applySnap` call) | **1400ms** | fallback |

Point-field **reflow** (particles moving to new target positions on territory-enter/query/return) is a separate linear-interpolated tween keyed by `{t0, dur}`, running in parallel with the camera tween — not the same clock, but always started in the same frame so they read as one motion.

## Camera-restore guarantee (Depth Rail contract)

Every `levelCam.<level>` snapshot is captured via `snap()` (`{tgt, r, theta, phi}`) at the moment of descending a level, and restored via `applySnap()` when returning — **exact**, not a re-derived approximation. This is what makes the Depth Rail a reliable spatial backstack rather than a soft "reset view" button.

## Panel motion (CSS keyframes, not camera)

| Keyframe | Duration | Used by |
|---|---|---|
| `hx-rise` (`translateY(10px)+opacity 0→1`) | Query bar: **500ms**; Identity/Inspect/Design/Sequence/Ask-Atlas panels: **400ms** | all panel-appear moments |
| `hx-fade` (opacity only) | structure emerging in the viewport (fade+build) | structure inspect entry |
| `hx-breathe` (opacity .5↔1 loop) | loading-state accents | loading only |
| `hx-scan` (translateY sweep, 3.2s linear infinite) | the scan-line over the static logo during loading | loading only |

All panel motion uses standard CSS `ease` timing (not the cubic camera easing) — these are UI chrome, not spatial motion.

## Reduced motion

`this.props.reduceMotion` (boolean prop, production should wire to `prefers-reduced-motion: reduce`):
- Ambient orbit fully disabled.
- Camera follow damping `k` forced to `1` — tweens/snaps land instantly on their target instead of easing.
- Panel CSS keyframes should still be honored by the browser's own reduced-motion handling for `transform`-based rises (recommend gating `hx-rise`/`hx-scan` behind the same media query in production CSS, since the prototype's keyframes are unconditional).

## Interruption behavior (applies to every scene tween above)

- Any new selection/navigation call starts a fresh `startTween()`, which **replaces** `this.tween` outright — an in-flight tween is abandoned mid-arc from its *current* interpolated position, not its destination. There is no queueing.
- Direct-manipulation input (orbit/pan/zoom) does not fight a tween: while `this.tween` is set, drag/wheel handlers are no-ops (`if(this.tween) return`) — the tween must finish or be replaced before manual control resumes.
