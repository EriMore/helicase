"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneMode } from "@/domain/atlas";
import type { AtlasCluster, AtlasManifest, AtlasProtein, CameraContext } from "@/domain/atlas-data";
import { CameraNavigation, cameraScale } from "@/engine/camera-navigation";

type WorldMetrics = { fps: number; visibleEntities: number; cameraDistance: number; heapMb: number | null };

type WorldCanvasProps = {
  mode: SceneMode;
  manifest: AtlasManifest | null;
  proteins: AtlasProtein[];
  highlightedIds: string[];
  selectedProteinId: string | null;
  focusedRegionId: string | null;
  restoreContext: CameraContext | null;
  onSelectProtein: (protein: AtlasProtein, context: CameraContext) => void;
  onFocusCluster: (cluster: AtlasCluster) => void;
  onHoverProtein: (protein: AtlasProtein | null) => void;
  onMetrics: (metrics: WorldMetrics) => void;
};

const palette: Record<string, THREE.Color> = {
  catalysis: new THREE.Color("#75ddff"), transport: new THREE.Color("#85a9ff"), signalling: new THREE.Color("#c7a2ff"),
  genome: new THREE.Color("#70f1cf"), expression: new THREE.Color("#b5ddff"), immunity: new THREE.Color("#ff9fc8"),
  structure: new THREE.Color("#d8f0ff"), metabolism: new THREE.Color("#89e6a7"), membrane: new THREE.Color("#6f87d9"),
  viral: new THREE.Color("#ffb470"), regulation: new THREE.Color("#e8cb87"), unresolved: new THREE.Color("#78869b"),
};

const pointVertex = `
attribute float atlasSize;
varying vec3 vColor;
varying float vFade;
void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float perspective = clamp(250.0 / max(1.0, -mvPosition.z), 0.55, 5.5);
  gl_PointSize = min(24.0, atlasSize * perspective);
  gl_Position = projectionMatrix * mvPosition;
  vFade = smoothstep(480.0, 32.0, -mvPosition.z);
}`;

const pointFragment = `
uniform float opacity;
varying vec3 vColor;
varying float vFade;
void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float radius = length(centered);
  if (radius > 0.5) discard;
  float core = smoothstep(0.5, 0.04, radius);
  float halo = smoothstep(0.5, 0.18, radius) * 0.38;
  gl_FragColor = vec4(vColor, (core + halo) * opacity * vFade);
}`;

function makePointMaterial(opacity: number) {
  return new THREE.ShaderMaterial({
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    uniforms: { opacity: { value: opacity } },
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });
}

export function WorldCanvas({
  mode, manifest, proteins, highlightedIds, selectedProteinId, focusedRegionId,
  restoreContext,
  onSelectProtein, onFocusCluster, onHoverProtein, onMetrics,
}: WorldCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  const manifestRef = useRef(manifest);
  const proteinsRef = useRef(proteins);
  const highlightedRef = useRef(new Set(highlightedIds));
  const selectedRef = useRef(selectedProteinId);
  const focusedRegionRef = useRef(focusedRegionId);
  const callbacks = useRef({ onSelectProtein, onFocusCluster, onHoverProtein, onMetrics });
  const clusterPoints = useRef<THREE.Points | null>(null);
  const proteinPoints = useRef<THREE.Points | null>(null);
  const clusterIndex = useRef<AtlasCluster[]>([]);
  const proteinIndex = useRef<AtlasProtein[]>([]);
  const navigation = useRef(new CameraNavigation());
  const queryReturnContext = useRef<CameraContext | null>(null);
  const queryActive = useRef(false);
  const [sceneEpoch, setSceneEpoch] = useState(0);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { manifestRef.current = manifest; }, [manifest]);
  useEffect(() => { proteinsRef.current = proteins; }, [proteins]);
  useEffect(() => { highlightedRef.current = new Set(highlightedIds); }, [highlightedIds]);
  useEffect(() => { selectedRef.current = selectedProteinId; }, [selectedProteinId]);
  useEffect(() => { focusedRegionRef.current = focusedRegionId; }, [focusedRegionId]);
  useEffect(() => { callbacks.current = { onSelectProtein, onFocusCluster, onHoverProtein, onMetrics }; }, [onFocusCluster, onHoverProtein, onMetrics, onSelectProtein]);

  useEffect(() => {
    if (mode === "universe" && !selectedProteinId && restoreContext) navigation.current.restore(restoreContext);
  }, [mode, restoreContext, selectedProteinId]);

  useEffect(() => {
    const active = highlightedIds.length > 0;
    if (active && !queryActive.current) {
      queryReturnContext.current = navigation.current.snapshot("before-query");
    } else if (!active && queryActive.current && queryReturnContext.current) {
      navigation.current.restore(queryReturnContext.current);
      queryReturnContext.current = null;
    }
    queryActive.current = active;
  }, [highlightedIds]);

  useEffect(() => {
    const points = clusterPoints.current;
    if (!points || !manifest) return;
    points.geometry.dispose();
    const positions = new Float32Array(manifest.clusters.length * 3);
    const colors = new Float32Array(manifest.clusters.length * 3);
    const sizes = new Float32Array(manifest.clusters.length);
    manifest.clusters.forEach((cluster, index) => {
      positions.set(cluster.center, index * 3);
      const color = palette[cluster.region] ?? palette.unresolved;
      colors.set([color.r, color.g, color.b], index * 3);
      sizes[index] = 3.4 + Math.min(12, Math.log2(cluster.count + 1) * 1.15);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("atlasSize", new THREE.BufferAttribute(sizes, 1));
    geometry.computeBoundingSphere();
    points.geometry = geometry;
    clusterIndex.current = manifest.clusters;
  }, [manifest, sceneEpoch]);

  useEffect(() => {
    const points = proteinPoints.current;
    if (!points) return;
    points.geometry.dispose();
    const highlighted = highlightedRef.current;
    const renderedProteins = highlighted.size ? proteins.filter((protein) => highlighted.has(protein.id)) : proteins;
    const positions = new Float32Array(renderedProteins.length * 3);
    const colors = new Float32Array(renderedProteins.length * 3);
    const sizes = new Float32Array(renderedProteins.length);
    renderedProteins.forEach((protein, index) => {
      positions.set(protein.position, index * 3);
      const base = palette[protein.region] ?? palette.unresolved;
      colors.set([base.r, base.g, base.b], index * 3);
      sizes[index] = highlighted.has(protein.id) ? 5.8 : 2.1 + Math.min(2.6, Math.log2(Math.max(16, protein.length)) * 0.25);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("atlasSize", new THREE.BufferAttribute(sizes, 1));
    geometry.computeBoundingSphere();
    points.geometry = geometry;
    proteinIndex.current = renderedProteins;
    if (highlighted.size > 0) {
      const matches = proteins.filter((protein) => highlighted.has(protein.id));
      if (matches.length) {
        const centre = matches.reduce((sum, protein) => sum.add(new THREE.Vector3(...protein.position)), new THREE.Vector3()).multiplyScalar(1 / matches.length);
        const radius = matches.reduce((largest, protein) => Math.max(largest, centre.distanceTo(new THREE.Vector3(...protein.position))), 0);
        const framingDistance = THREE.MathUtils.clamp(radius * 1.35 + 38, 85, 155);
        navigation.current.focus(centre, framingDistance, "query-results");
      }
    }
  }, [highlightedIds, proteins, sceneEpoch]);

  useEffect(() => {
    if (!manifest || !focusedRegionId) return;
    const region = manifest.regions.find((candidate) => candidate.id === focusedRegionId);
    if (!region) return;
    navigation.current.focus(new THREE.Vector3(...region.center), 108, `region-${region.id}`);
  }, [focusedRegionId, manifest]);

  useEffect(() => {
    if (!selectedProteinId) return;
    const protein = proteinsRef.current.find((candidate) => candidate.id === selectedProteinId);
    if (!protein) return;
    navigation.current.focus(new THREE.Vector3(...protein.position), 18, `protein-${protein.id}`);
  }, [selectedProteinId]);

  useEffect(() => {
    const mount = container.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#02040a", 0.0032);
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.2, 1200);
    const navigator = navigation.current;
    navigator.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    camera.position.copy(navigator.position);
    const target = navigator.target.clone();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor("#02040a", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const clusters = new THREE.Points(new THREE.BufferGeometry(), makePointMaterial(0.95));
    const proteinField = new THREE.Points(new THREE.BufferGeometry(), makePointMaterial(0.78));
    clusterPoints.current = clusters;
    proteinPoints.current = proteinField;
    setSceneEpoch((current) => current + 1);
    scene.add(clusters, proteinField);

    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array(1800 * 3);
    for (let index = 0; index < 1800; index += 1) {
      const random = Math.sin(index * 991.17) * 43758.5453;
      const random2 = Math.sin(index * 313.91) * 21413.317;
      const random3 = Math.sin(index * 127.73) * 9357.11;
      dust[index * 3] = (random - Math.floor(random) - 0.5) * 700;
      dust[index * 3 + 1] = (random2 - Math.floor(random2) - 0.5) * 420;
      dust[index * 3 + 2] = (random3 - Math.floor(random3) - 0.5) * 700;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dustMaterial = new THREE.PointsMaterial({ color: "#6f86a7", size: 0.26, transparent: true, opacity: 0.22, depthWrite: false });
    const dustField = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustField);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 2.8 };
    const pointer = new THREE.Vector2();
    let pointerDown = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let pointerButton = 0;
    let hoveredId: string | null = null;
    const keys = new Set<string>();

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const findProtein = () => {
      raycaster.setFromCamera(pointer, camera);
      const distance = camera.position.distanceTo(target);
      if (distance < 175 && proteinIndex.current.length) {
        const hit = raycaster.intersectObject(proteinField, false)[0];
        if (hit?.index != null) return proteinIndex.current[hit.index] ?? null;
      }
      return null;
    };
    const findCluster = () => {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(clusters, false)[0];
      return hit?.index != null ? clusterIndex.current[hit.index] ?? null : null;
    };
    const onPointerDown = (event: PointerEvent) => {
      mount.focus({ preventScroll: true });
      pointerDown = true; moved = false; pointerButton = event.button; startX = lastX = event.clientX; startY = lastY = event.clientY;
      navigator.cancel();
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      if (pointerDown) {
        const dx = event.clientX - lastX; const dy = event.clientY - lastY;
        moved ||= Math.hypot(event.clientX - startX, event.clientY - startY) > 5;
        if (pointerButton === 2 || pointerButton === 1 || event.shiftKey) navigator.truck(dx, dy, camera, mount.clientHeight);
        else navigator.orbit(dx, dy, mount.clientHeight);
        lastX = event.clientX; lastY = event.clientY;
        return;
      }
      const protein = findProtein();
      const nextId = protein?.id ?? null;
      if (nextId !== hoveredId) {
        hoveredId = nextId;
        callbacks.current.onHoverProtein(protein);
        renderer.domElement.style.cursor = protein || findCluster() ? "crosshair" : "grab";
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      pointerDown = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (moved) return;
      updatePointer(event);
      const protein = findProtein();
      if (protein) {
        const distance = camera.position.distanceTo(target);
        callbacks.current.onSelectProtein(protein, {
          position: camera.position.toArray() as [number, number, number],
          target: target.toArray() as [number, number, number],
          scale: cameraScale(distance),
        });
        return;
      }
      const cluster = findCluster();
      if (cluster) {
        navigator.focus(new THREE.Vector3(...cluster.center), Math.max(38, Math.min(82, 28 + Math.log2(cluster.count + 1) * 4)), `cluster-${cluster.id}`);
        callbacks.current.onFocusCluster(cluster);
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      updatePointer(event as unknown as PointerEvent);
      raycaster.setFromCamera(pointer, camera);
      const anchorDistance = camera.position.distanceTo(target);
      const anchor = raycaster.ray.at(anchorDistance, new THREE.Vector3());
      const normalizedDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? event.deltaY * mount.clientHeight : event.deltaY;
      navigator.dolly(normalizedDelta, anchor);
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches("input,textarea,[contenteditable=true]")) return;
      keys.add(event.code);
      if (event.code === "Home") { event.preventDefault(); navigator.home(); }
      if (event.code === "KeyR") navigator.resetOrientation();
      if (event.code === "Backspace") { event.preventDefault(); navigator.back(); }
      if (event.code === "Escape") { keys.clear(); navigator.cancel(); }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Timer();
    clock.connect(document);
    let animationFrame = 0;
    let metricFrames = 0;
    let metricStart = performance.now();
    const render = () => {
      clock.update();
      const elapsed = clock.getElapsed();
      const dt = Math.min(clock.getDelta(), 0.05);
      const state = modeRef.current;
      if (state === "landing" && navigator.desiredPosition.distanceToSquared(new THREE.Vector3(0, 20, 278)) > 0.5) navigator.focus(new THREE.Vector3(), 278, "landing", false);
      const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
      const right = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      const vertical = Number(keys.has("KeyE")) - Number(keys.has("KeyQ"));
      if (state === "universe" && (forward || right || vertical)) navigator.keyboard(forward, right, vertical, camera, dt);
      const update = navigator.update(dt);
      camera.position.copy(update.position);
      target.copy(update.target);
      camera.lookAt(target);
      const distance = camera.position.distanceTo(target);
      const queryClusterFactor = highlightedRef.current.size ? 0.003 : 1;
      const clusterOpacity = state === "structure" || state === "xray" || state === "designing" || state === "designComplete" ? 0.035 : (THREE.MathUtils.smoothstep(distance, 42, 190) * 0.86 + 0.08) * queryClusterFactor;
      const proteinOpacity = state === "structure" || state === "xray" || state === "designing" || state === "designComplete" ? 0.025 : (1 - THREE.MathUtils.smoothstep(distance, 95, 245)) * 0.95;
      (clusters.material as THREE.ShaderMaterial).uniforms.opacity.value = clusterOpacity;
      (proteinField.material as THREE.ShaderMaterial).uniforms.opacity.value = proteinOpacity;
      clusters.rotation.y = Math.sin(elapsed * 0.025) * 0.006;
      proteinField.rotation.y = clusters.rotation.y;
      dustField.rotation.y = elapsed * 0.0018;
      renderer.render(scene, camera);

      metricFrames += 1;
      const now = performance.now();
      if (now - metricStart >= 1000) {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        callbacks.current.onMetrics({
          fps: Math.round(metricFrames * 1000 / (now - metricStart)),
          visibleEntities: highlightedRef.current.size ? proteinIndex.current.length : distance > 150 ? clusterIndex.current.length : proteinIndex.current.length,
          cameraDistance: Math.round(distance),
          heapMb: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
        });
        metricFrames = 0; metricStart = now;
      }
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      clock.dispose();
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clusters.geometry.dispose(); (clusters.material as THREE.Material).dispose();
      proteinField.geometry.dispose(); (proteinField.material as THREE.Material).dispose();
      dustGeometry.dispose(); dustMaterial.dispose(); renderer.dispose();
      clusterPoints.current = null; proteinPoints.current = null;
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <>
    <p id="atlas-navigation-help" className="sr-only">Navigate the protein universe with pointer drag, shift drag to pan, wheel to move through scale, W A S D or arrow keys to move, Q and E vertically, Home to return home, R to reset orientation, Backspace to restore the previous camera, and Escape to interrupt automated movement.</p>
    <div className="world-canvas" ref={container} role="application" tabIndex={0} aria-label="Navigable spatial protein atlas" aria-describedby="atlas-navigation-help" />
  </>;
}
