import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CameraNavigation, cameraScale } from "./camera-navigation";

describe("CameraNavigation", () => {
  it("maps camera distance to semantic scale", () => {
    expect(cameraScale(240)).toBe("universe");
    expect(cameraScale(150)).toBe("region");
    expect(cameraScale(80)).toBe("cluster");
    expect(cameraScale(20)).toBe("protein");
  });

  it("focuses deterministically and restores camera history", () => {
    const navigation = new CameraNavigation();
    const initial = navigation.snapshot("initial");
    navigation.focus(new THREE.Vector3(10, 20, 30), 40, "test");
    for (let index = 0; index < 180; index += 1) navigation.update(1 / 60);
    expect(navigation.target.distanceTo(new THREE.Vector3(10, 20, 30))).toBeLessThan(0.02);
    expect(navigation.position.distanceTo(navigation.target)).toBeCloseTo(40, 1);
    navigation.back();
    for (let index = 0; index < 180; index += 1) navigation.update(1 / 60);
    expect(navigation.position.toArray()).toEqual(expect.arrayContaining(initial.position.map((value) => expect.closeTo(value, 1))));
  });

  it("clamps dolly distance", () => {
    const navigation = new CameraNavigation();
    navigation.dolly(-1_000_000);
    expect(navigation.desiredPosition.distanceTo(navigation.desiredTarget)).toBeGreaterThanOrEqual(8);
    navigation.dolly(1_000_000);
    expect(navigation.desiredPosition.distanceTo(navigation.desiredTarget)).toBeLessThanOrEqual(520);
  });
});
