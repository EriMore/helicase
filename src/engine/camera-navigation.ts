import * as THREE from "three";

/**
 * Spherical orbit camera engine matching docs/design/final/MOTION_AND_CAMERA_SPEC.md
 * exactly: { target, r, theta, phi }, FOV 46°, r clamped [40,1700], phi clamped
 * [0.14,3.0], a critically-damped follow under every discrete tween, and a
 * per-transition duration table on a single easeInOutCubic curve.
 */

export type DepthLevel = "universe" | "territory" | "protein";
export type SphericalSnapshot = { target: [number, number, number]; r: number; theta: number; phi: number };
type Spherical = { target: THREE.Vector3; r: number; theta: number; phi: number };
type Tween = { t0: number; dur: number; from: Spherical; to: Spherical };

export const CAMERA_FOV = 46;
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 9000;
export const R_MIN = 40;
export const R_MAX = 1700;
const PHI_MIN = 0.14;
const PHI_MAX = 3.0;
const ORBIT_RAD_PER_PX = 0.0045;
const AMBIENT_IDLE_MS = 3500;
const AMBIENT_RAD_PER_SEC = 0.00022 * 60;
const FOLLOW_RATE = 5.0;
const DEFAULT_HOME: Spherical = { target: new THREE.Vector3(0, 0, 0), r: 640, theta: 0.7, phi: 1.12 };

export const TWEEN_MS = {
  selectProtein: 1600,
  enterTerritoryCamera: 1500,
  enterTerritoryReflow: 1400,
  inspectStructure: 1500,
  startDesign: 1400,
  returnToGlance: 1300,
  returnToTerritory: 1300,
  returnToUniverseCamera: 1500,
  returnToUniverseReflow: 1300,
  queryMatch: 1500,
  clearQuery: 1300,
  doubleClickFocus: 1100,
  default: 1400,
} as const;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cloneSpherical(state: Spherical): Spherical {
  return { target: state.target.clone(), r: state.r, theta: state.theta, phi: state.phi };
}

export class CameraEngine {
  /** The logical/desired state — set immediately by every discrete action. */
  cam: Spherical = cloneSpherical(DEFAULT_HOME);
  /** The rendered state — always eased toward `cam`, by tween or continuous follow. */
  now: Spherical = cloneSpherical(DEFAULT_HOME);
  reducedMotion = false;
  private tween: Tween | null = null;
  private levelCam = new Map<DepthLevel, SphericalSnapshot>();
  private lastActivity = typeof performance !== "undefined" ? performance.now() : 0;

  markActivity() {
    this.lastActivity = typeof performance !== "undefined" ? performance.now() : 0;
  }

  private clampR(r: number) { return THREE.MathUtils.clamp(r, R_MIN, R_MAX); }
  private clampPhi(phi: number) { return THREE.MathUtils.clamp(phi, PHI_MIN, PHI_MAX); }
  private clampTarget() {
    this.cam.target.x = THREE.MathUtils.clamp(this.cam.target.x, -900, 900);
    this.cam.target.y = THREE.MathUtils.clamp(this.cam.target.y, -600, 600);
    this.cam.target.z = THREE.MathUtils.clamp(this.cam.target.z, -900, 900);
  }

  /** Left-drag: orbit theta/phi. No-op while a tween is in flight. */
  orbit(deltaX: number, deltaY: number) {
    if (this.tween) return;
    this.markActivity();
    this.cam.theta -= deltaX * ORBIT_RAD_PER_PX;
    this.cam.phi = this.clampPhi(this.cam.phi - deltaY * ORBIT_RAD_PER_PX);
  }

  /** Right/middle/shift-drag: pan (truck), speed scales with r. No-op while a tween is in flight. */
  pan(deltaX: number, deltaY: number, cameraMatrixWorld: THREE.Matrix4) {
    if (this.tween) return;
    this.markActivity();
    const right = new THREE.Vector3().setFromMatrixColumn(cameraMatrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cameraMatrixWorld, 1);
    const scale = this.cam.r * 0.0016;
    this.cam.target.addScaledVector(right, -deltaX * scale).addScaledVector(up, deltaY * scale);
    this.clampTarget();
  }

  /** Wheel: zoom toward pointer. No-op while a tween is in flight. */
  dolly(deltaY: number, ctrlKey: boolean, pointerWorld: THREE.Vector3 | null) {
    if (this.tween) return;
    this.markActivity();
    const factor = 1 + (deltaY > 0 ? 1 : -1) * (ctrlKey ? 0.05 : 0.09);
    const nextR = this.clampR(this.cam.r * factor);
    const zoomingIn = nextR < this.cam.r;
    this.cam.r = nextR;
    if (pointerWorld) {
      this.cam.target.lerp(pointerWorld, zoomingIn ? 0.16 : -0.10);
      this.clampTarget();
    }
  }

  /** Double-click: focus, r → max(160, r×0.6). Always interrupts any in-flight tween. */
  focusDoubleClick(point: THREE.Vector3) {
    this.markActivity();
    this.cam.target.copy(point);
    this.cam.r = Math.max(160, this.cam.r * 0.6);
    this.startTween(TWEEN_MS.doubleClickFocus);
  }

  private startTween(durationMs: number) {
    this.tween = { t0: typeof performance !== "undefined" ? performance.now() : 0, dur: durationMs, from: cloneSpherical(this.now), to: cloneSpherical(this.cam) };
  }

  /** Set the desired target/r/theta/phi and animate `now` toward it over durationMs (easeInOutCubic). */
  applyTarget(next: { target: THREE.Vector3; r: number; theta: number; phi: number }, durationMs: number = TWEEN_MS.default) {
    this.cam.target.copy(next.target);
    this.cam.r = this.clampR(next.r);
    this.cam.theta = next.theta;
    this.cam.phi = this.clampPhi(next.phi);
    this.startTween(durationMs);
  }

  /** Cancel an in-flight tween without moving the camera. Direct manipulation resumes from `now`. */
  cancel() {
    if (!this.tween) return;
    this.cam.target.copy(this.now.target);
    this.cam.r = this.now.r; this.cam.theta = this.now.theta; this.cam.phi = this.now.phi;
    this.tween = null;
  }

  get inFlight() { return this.tween !== null; }

  snapshot(): SphericalSnapshot {
    return { target: this.cam.target.toArray() as [number, number, number], r: this.cam.r, theta: this.cam.theta, phi: this.cam.phi };
  }

  captureLevel(level: DepthLevel) { this.levelCam.set(level, this.snapshot()); }
  hasLevel(level: DepthLevel) { return this.levelCam.has(level); }
  clearLevels() { this.levelCam.clear(); }

  /** Restore a saved depth-level snapshot exactly — the Depth Rail's core guarantee. */
  restoreLevel(level: DepthLevel, durationMs: number = TWEEN_MS.default): boolean {
    const snap = this.levelCam.get(level);
    if (!snap) return false;
    this.applyTarget({ target: new THREE.Vector3(...snap.target), r: snap.r, theta: snap.theta, phi: snap.phi }, durationMs);
    return true;
  }

  /** Home framing: default {r:640, phi:1.12} if no universe snapshot was ever captured. */
  goHome(durationMs: number = TWEEN_MS.returnToUniverseCamera) {
    if (this.restoreLevel("universe", durationMs)) return;
    this.applyTarget({ target: DEFAULT_HOME.target.clone(), r: DEFAULT_HOME.r, theta: this.cam.theta, phi: DEFAULT_HOME.phi }, durationMs);
  }

  update(dtSeconds: number, ambientEligible: boolean): { position: THREE.Vector3; target: THREE.Vector3; r: number; theta: number; phi: number } {
    const dt = Math.min(dtSeconds, 0.05);
    if (this.tween) {
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      const k = Math.min(1, (now - this.tween.t0) / this.tween.dur);
      const eased = this.reducedMotion ? 1 : easeInOutCubic(k);
      this.now.target.lerpVectors(this.tween.from.target, this.tween.to.target, eased);
      this.now.r = THREE.MathUtils.lerp(this.tween.from.r, this.tween.to.r, eased);
      this.now.theta = THREE.MathUtils.lerp(this.tween.from.theta, this.tween.to.theta, eased);
      this.now.phi = THREE.MathUtils.lerp(this.tween.from.phi, this.tween.to.phi, eased);
      if (k >= 1) this.tween = null;
    } else {
      const follow = this.reducedMotion ? 1 : 1 - Math.exp(-dt * FOLLOW_RATE);
      this.now.target.lerp(this.cam.target, follow);
      this.now.r += (this.cam.r - this.now.r) * follow;
      this.now.theta += (this.cam.theta - this.now.theta) * follow;
      this.now.phi += (this.cam.phi - this.now.phi) * follow;
      const idleMs = (typeof performance !== "undefined" ? performance.now() : 0) - this.lastActivity;
      if (ambientEligible && !this.reducedMotion && idleMs > AMBIENT_IDLE_MS) {
        this.cam.theta += AMBIENT_RAD_PER_SEC * dt;
      }
    }
    const position = new THREE.Vector3(
      this.now.target.x + this.now.r * Math.sin(this.now.phi) * Math.cos(this.now.theta),
      this.now.target.y + this.now.r * Math.cos(this.now.phi),
      this.now.target.z + this.now.r * Math.sin(this.now.phi) * Math.sin(this.now.theta),
    );
    return { position, target: this.now.target, r: this.now.r, theta: this.now.theta, phi: this.now.phi };
  }
}
