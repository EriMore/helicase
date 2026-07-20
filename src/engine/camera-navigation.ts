import * as THREE from "three";
import type { CameraContext } from "@/domain/atlas-data";

export type NavigationSnapshot = CameraContext & { up: [number, number, number]; id: string };
export type NavigationUpdate = { position: THREE.Vector3; target: THREE.Vector3; settled: boolean };

const HOME_POSITION = new THREE.Vector3(0, 18, 240);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);
const MIN_DISTANCE = 8;
const MAX_DISTANCE = 520;

export function cameraScale(distance: number): CameraContext["scale"] {
  if (distance > 205) return "universe";
  if (distance > 115) return "region";
  if (distance > 42) return "cluster";
  return "protein";
}

export class CameraNavigation {
  readonly position = HOME_POSITION.clone();
  readonly target = HOME_TARGET.clone();
  readonly desiredPosition = HOME_POSITION.clone();
  readonly desiredTarget = HOME_TARGET.clone();
  private velocity = new THREE.Vector3();
  private targetVelocity = new THREE.Vector3();
  private history: NavigationSnapshot[] = [];
  private transitionId: string | null = null;
  reducedMotion = false;

  snapshot(id = globalThis.crypto?.randomUUID?.() ?? `camera-${Date.now()}`): NavigationSnapshot {
    const distance = this.position.distanceTo(this.target);
    return { id, position: this.position.toArray() as [number, number, number], target: this.target.toArray() as [number, number, number], up: [0, 1, 0], scale: cameraScale(distance) };
  }

  capture(id?: string) { const snapshot = this.snapshot(id); this.history.push(snapshot); if (this.history.length > 32) this.history.shift(); return snapshot; }

  restore(snapshot: CameraContext | NavigationSnapshot, immediate = this.reducedMotion) {
    this.cancel();
    this.desiredPosition.set(...snapshot.position);
    this.desiredTarget.set(...snapshot.target);
    if (immediate) { this.position.copy(this.desiredPosition); this.target.copy(this.desiredTarget); }
  }

  home() { this.capture("before-home"); this.focus(HOME_TARGET, HOME_POSITION.distanceTo(HOME_TARGET), "home", false); }
  back() { const previous = this.history.pop(); if (previous) this.restore(previous); return previous ?? null; }

  resetOrientation() {
    const distance = THREE.MathUtils.clamp(this.position.distanceTo(this.target), MIN_DISTANCE, MAX_DISTANCE);
    this.desiredPosition.copy(this.target).add(new THREE.Vector3(0, Math.min(18, distance * 0.08), distance));
    this.cancelVelocity();
  }

  focus(point: THREE.Vector3, distance: number, transitionId = "focus", capture = true) {
    if (capture) this.capture(`before-${transitionId}`);
    const direction = this.desiredPosition.clone().sub(this.desiredTarget).normalize();
    if (direction.lengthSq() < 0.5) direction.set(0, 0, 1);
    this.desiredTarget.copy(point);
    this.desiredPosition.copy(point).add(direction.multiplyScalar(THREE.MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE)));
    this.transitionId = transitionId;
    this.cancelVelocity();
  }

  orbit(deltaX: number, deltaY: number, viewportHeight: number) {
    this.cancel();
    const offset = this.desiredPosition.clone().sub(this.desiredTarget);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    const radiansPerPixel = Math.PI / Math.max(320, viewportHeight);
    spherical.theta -= deltaX * radiansPerPixel;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - deltaY * radiansPerPixel, 0.08, Math.PI - 0.08);
    this.desiredPosition.copy(this.desiredTarget).add(new THREE.Vector3().setFromSpherical(spherical));
    this.velocity.set(deltaX * -0.004, deltaY * -0.004, 0);
  }

  truck(deltaX: number, deltaY: number, camera: THREE.PerspectiveCamera, viewportHeight: number) {
    this.cancel();
    const distance = this.desiredPosition.distanceTo(this.desiredTarget);
    const worldPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) / Math.max(1, viewportHeight);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-deltaX * worldPerPixel);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(deltaY * worldPerPixel);
    const translation = right.add(up);
    this.desiredPosition.add(translation); this.desiredTarget.add(translation);
    this.targetVelocity.copy(translation).multiplyScalar(0.09);
  }

  dolly(delta: number, anchor?: THREE.Vector3) {
    this.cancel();
    const offset = this.desiredPosition.clone().sub(this.desiredTarget);
    const oldDistance = offset.length();
    const nextDistance = THREE.MathUtils.clamp(oldDistance * Math.exp(delta * 0.00115), MIN_DISTANCE, MAX_DISTANCE);
    const zoomFraction = 1 - nextDistance / oldDistance;
    if (anchor && zoomFraction > 0) {
      const shift = anchor.clone().sub(this.desiredTarget).multiplyScalar(THREE.MathUtils.clamp(zoomFraction * 0.82, 0, 0.72));
      this.desiredTarget.add(shift);
    }
    this.desiredPosition.copy(this.desiredTarget).add(offset.normalize().multiplyScalar(nextDistance));
  }

  keyboard(forward: number, right: number, up: number, camera: THREE.PerspectiveCamera, dt: number) {
    this.cancel();
    const distance = this.desiredPosition.distanceTo(this.desiredTarget);
    const speed = THREE.MathUtils.clamp(distance * 0.72, 16, 180) * dt;
    const forwardVector = this.desiredTarget.clone().sub(this.desiredPosition).normalize();
    const rightVector = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).normalize();
    const upVector = new THREE.Vector3(0, 1, 0);
    const movement = forwardVector.multiplyScalar(forward * speed).add(rightVector.multiplyScalar(right * speed)).add(upVector.multiplyScalar(up * speed));
    this.desiredPosition.add(movement); this.desiredTarget.add(movement);
  }

  cancel() { this.transitionId = null; }
  private cancelVelocity() { this.velocity.set(0, 0, 0); this.targetVelocity.set(0, 0, 0); }

  update(dt: number): NavigationUpdate {
    const factor = this.reducedMotion ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 9.5);
    if (!this.transitionId) { this.velocity.multiplyScalar(Math.exp(-dt * 8)); this.targetVelocity.multiplyScalar(Math.exp(-dt * 8)); }
    this.position.lerp(this.desiredPosition, factor);
    this.target.lerp(this.desiredTarget, factor * 1.08);
    const settled = this.position.distanceToSquared(this.desiredPosition) < 0.0005 && this.target.distanceToSquared(this.desiredTarget) < 0.0005;
    if (settled) this.transitionId = null;
    return { position: this.position, target: this.target, settled };
  }
}
