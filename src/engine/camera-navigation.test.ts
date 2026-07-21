import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { CameraEngine, R_MAX, R_MIN, TWEEN_MS, easeInOutCubic } from "./camera-navigation";

/** Advances `performance.now()` deterministically so wall-clock-driven tweens settle in tests. */
function withAdvancingClock<T>(run: (advanceMs: (step: number) => void) => T): T {
  let now = 0;
  const spy = vi.spyOn(performance, "now").mockImplementation(() => now);
  try {
    return run((step) => { now += step; });
  } finally {
    spy.mockRestore();
  }
}

describe("easeInOutCubic", () => {
  it("is symmetric and passes through the anchor points", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe("CameraEngine", () => {
  it("tweens to a target over the requested duration and settles exactly", () => {
    withAdvancingClock((advanceMs) => {
      const engine = new CameraEngine();
      engine.applyTarget({ target: new THREE.Vector3(10, 20, 30), r: 150, theta: 0.7, phi: 1.05 }, TWEEN_MS.selectProtein);
      expect(engine.inFlight).toBe(true);
      for (let index = 0; index < 200; index += 1) { advanceMs(1000 / 60); engine.update(1 / 60, false); }
      expect(engine.inFlight).toBe(false);
      expect(engine.now.target.distanceTo(new THREE.Vector3(10, 20, 30))).toBeLessThan(0.01);
      expect(engine.now.r).toBeCloseTo(150, 1);
    });
  });

  it("captures and restores an exact per-level camera snapshot", () => {
    withAdvancingClock((advanceMs) => {
      const engine = new CameraEngine();
      for (let index = 0; index < 60; index += 1) { advanceMs(1000 / 60); engine.update(1 / 60, false); }
      const homeSnapshot = engine.snapshot();
      engine.captureLevel("universe");
      engine.applyTarget({ target: new THREE.Vector3(5, 5, 5), r: 260, theta: 1.1, phi: 0.9 }, TWEEN_MS.enterTerritoryCamera);
      for (let index = 0; index < 200; index += 1) { advanceMs(1000 / 60); engine.update(1 / 60, false); }
      expect(engine.hasLevel("universe")).toBe(true);
      expect(engine.restoreLevel("universe", TWEEN_MS.returnToUniverseCamera)).toBe(true);
      for (let index = 0; index < 200; index += 1) { advanceMs(1000 / 60); engine.update(1 / 60, false); }
      expect(engine.now.r).toBeCloseTo(homeSnapshot.r, 1);
      expect(engine.now.theta).toBeCloseTo(homeSnapshot.theta, 3);
    });
  });

  it("clamps radius and polar angle to the design contract", () => {
    const engine = new CameraEngine();
    engine.dolly(1_000_000, false, null);
    expect(engine.cam.r).toBeLessThanOrEqual(R_MAX);
    engine.dolly(-1_000_000, false, null);
    expect(engine.cam.r).toBeGreaterThanOrEqual(R_MIN);
    engine.orbit(0, -1_000_000);
    expect(engine.cam.phi).toBeGreaterThanOrEqual(0.14);
    engine.orbit(0, 1_000_000);
    expect(engine.cam.phi).toBeLessThanOrEqual(3.0);
  });

  it("ignores direct manipulation while a tween is in flight", () => {
    const engine = new CameraEngine();
    engine.applyTarget({ target: new THREE.Vector3(1, 1, 1), r: 200, theta: 0, phi: 1 }, 1000);
    const thetaBefore = engine.cam.theta;
    engine.orbit(500, 0);
    expect(engine.cam.theta).toBe(thetaBefore);
  });

  it("falls back to the default home framing when no universe snapshot exists", () => {
    // r:900 (not the design spec's literal 640) — the real corpus's six clusters
    // are unevenly sized, so arrival needs more headroom than the prototype's evenly
    // sized synthetic dataset did. See docs/handoff/DESIGN_DELTA.md.
    const engine = new CameraEngine();
    engine.goHome();
    expect(engine.cam.r).toBe(900);
    expect(engine.cam.phi).toBeCloseTo(1.12, 5);
  });
});
