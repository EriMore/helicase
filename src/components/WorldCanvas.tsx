"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SceneState } from "@/domain/atlas";
import type { AtlasProtein } from "@/domain/atlas-data";
import { territories, territoryCenter, territoryIndexForRegion, worldPosition } from "@/domain/territories";
import { computeRelationshipThreads } from "@/domain/relationships";
import { CAMERA_FAR, CAMERA_FOV, CAMERA_NEAR, CameraEngine, TWEEN_MS } from "@/engine/camera-navigation";

export type Theme = "light" | "dark";
export type WorldMetrics = { fps: number; visibleCount: number };

const THEME_TABLE: Record<Theme, { fam: string[]; teal: string; fog: string; fogNear: number; fogFar: number; size: number; additive: boolean; dimNon: number; glow: string; dishTint: string; dishRim: string }> = {
  light: { fam: ["#3c5a86", "#8f4a44", "#3f6f60", "#9a7a34", "#6a4a70", "#4a4f57"], teal: "#0c8c78", fog: "#efece4", fogNear: 300, fogFar: 1200, size: 22, additive: false, dimNon: 0.30, glow: "#22262b", dishTint: "#f3f1ea", dishRim: "#ffffff" },
  dark: { fam: ["#7d97d0", "#d68b83", "#5fc6a6", "#d9b96e", "#b490c8", "#9aa2b0"], teal: "#34d6b8", fog: "#0d1013", fogNear: 440, fogFar: 2400, size: 26, additive: true, dimNon: 0.26, glow: "#ffffff", dishTint: "#11141a", dishRim: "#9fd8ff" },
};
const THREAD_LIMIT = 5;

const pointVertexShader = `
attribute vec3 color;
attribute float aScale;
attribute float aMatch;
attribute float aExempt;
attribute float aTerritory;
uniform float uSize, uPR, uFogNear, uFogFar, uTime;
varying vec3 vColor;
varying float vFog, vMatch, vExempt, vTerritory;
void main() {
  vColor = color; vMatch = aMatch; vExempt = aExempt; vTerritory = aTerritory;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float pulse = 0.5 + 0.5 * sin(uTime * 2.1);
  float grow = 1.0 + aMatch * (0.55 + 0.3 * pulse);
  gl_PointSize = min(aScale * uSize * uPR * grow * (300.0 / -mv.z), 42.0 * uPR);
  float d = -mv.z;
  vFog = clamp((d - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const pointFragmentShader = `
precision mediump float;
varying vec3 vColor; varying float vFog, vMatch, vExempt, vTerritory;
uniform vec3 uFog, uTeal, uGlow; uniform float uTheme, uDim, uDimNon, uActiveTerritory, uTerritoryFocus;
uniform highp float uTime;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  // Highlighted (selected/matched) points read as a soft glowing "blot" —
  // everything else stays a crisp, defined dot.
  float edge = mix(0.24, 0.42, vMatch);
  float a = smoothstep(0.5, edge, d);
  if (a <= 0.002) discard;
  float pulse = 0.5 + 0.5 * sin(uTime * 2.1);
  vec3 c = mix(vColor, uTeal, vMatch * 0.55);
  c = mix(c, uGlow, vMatch * (0.32 + 0.22 * pulse));
  float fogMix = uTheme < 0.5 ? 0.9 : 0.35;
  c = mix(c, uFog, vFog * fogMix * (1.0 - vMatch));
  float alpha = a;
  alpha *= mix(1.0, 1.0 - vFog * 0.82, step(uTheme, 0.5));
  alpha *= mix(1.0, 0.42, step(0.5, uTheme)) * (1.0 - vMatch) + vMatch;
  alpha *= uDim;
  float keep = max(vMatch, vExempt);
  alpha *= mix(uDimNon, 1.0, keep);
  if (uTerritoryFocus > 0.5) { float m = abs(vTerritory - uActiveTerritory) < 0.5 ? 1.0 : uDimNon; alpha *= mix(m, 1.0, keep); }
  gl_FragColor = vec4(c, clamp(alpha, 0.0, 1.0));
}`;

const dishVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const dishFragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform vec3 uTint; uniform vec3 uRim; uniform float uOpacity; uniform vec2 uLightDir; uniform float uPulse;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float rim = smoothstep(0.58, 1.0, d);
  vec2 n = length(c) > 0.0001 ? normalize(c) : vec2(0.0);
  float spec = pow(max(0.0, dot(n, uLightDir)), 5.0) * smoothstep(1.0, 0.25, d);
  float grain = (hash(floor(vUv * 180.0)) - 0.5) * 0.05;
  float alpha = (0.16 + rim * 0.3 + spec * 0.45 + grain) * uOpacity * (0.82 + 0.18 * uPulse);
  vec3 color = mix(uTint, uRim, clamp(rim * 0.7 + spec * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
}`;

type ThreeRefs = {
  renderer: THREE.WebGLRenderer; sceneObj: THREE.Scene; camera: THREE.PerspectiveCamera;
  points: THREE.Points; geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial;
  base: Float32Array; target: Float32Array; territoryIndex: Int16Array;
  dish: THREE.Mesh; dishMaterial: THREE.ShaderMaterial; raycaster: THREE.Raycaster; threadGroup: THREE.Group;
  proteinList: AtlasProtein[];
  threadKey: string;
};

type WorldCanvasProps = {
  theme: Theme;
  scene: SceneState;
  proteins: AtlasProtein[];
  onSelectProtein: (protein: AtlasProtein) => void;
  onEnterTerritory: (territoryId: string) => void;
  onHoverProtein: (protein: AtlasProtein | null) => void;
  onMetrics: (metrics: WorldMetrics) => void;
  onDeselect: () => void;
};

export function WorldCanvas({ theme, scene, proteins, onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics, onDeselect }: WorldCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const labelsWrap = useRef<HTMLDivElement>(null);
  const territoryLabelEls = useRef<HTMLDivElement[]>([]);
  const hoverLabelEl = useRef<HTMLDivElement | null>(null);

  const engine = useRef(new CameraEngine());
  const sceneRef = useRef(scene);
  const themeRef = useRef(theme);
  const proteinsRef = useRef(proteins);
  const callbacks = useRef({ onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics, onDeselect });

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { proteinsRef.current = proteins; }, [proteins]);
  useEffect(() => { callbacks.current = { onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics, onDeselect }; }, [onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics, onDeselect]);

  const three = useRef<ThreeRefs | null>(null);

  // Rebuild the point field whenever the loaded protein set changes.
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    const count = proteins.length;
    const base = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const match = new Float32Array(count);
    const exempt = new Float32Array(count);
    const territoryIndex = new Int16Array(count);
    const table = THEME_TABLE[themeRef.current];
    const highlighted = new Set(sceneRef.current.queryResultIds);
    if (sceneRef.current.selectedProteinId) highlighted.add(sceneRef.current.selectedProteinId);
    const activeTerritory = territories.findIndex((territory) => territory.id === sceneRef.current.territoryId);
    proteins.forEach((protein, index) => {
      const [wx, wy, wz] = worldPosition(protein.position);
      base[index * 3] = wx; base[index * 3 + 1] = wy; base[index * 3 + 2] = wz;
      const territoryIdx = territoryIndexForRegion(protein.region);
      territoryIndex[index] = territoryIdx;
      const c = new THREE.Color(table.fam[territoryIdx]);
      color[index * 3] = c.r; color[index * 3 + 1] = c.g; color[index * 3 + 2] = c.b;
      scale[index] = 0.5 + Math.min(1.1, Math.log2(Math.max(16, protein.length)) * 0.09);
      match[index] = highlighted.has(protein.id) ? 1 : 0;
      const expand = activeTerritory >= 0 && territoryIdx === activeTerritory;
      const center = expand ? territoryCenter(activeTerritory) : null;
      if (center) {
        target[index * 3] = center[0] + (base[index * 3] - center[0]) * 1.7;
        target[index * 3 + 1] = center[1] + (base[index * 3 + 1] - center[1]) * 1.7;
        target[index * 3 + 2] = center[2] + (base[index * 3 + 2] - center[2]) * 1.7;
      } else {
        target[index * 3] = base[index * 3]; target[index * 3 + 1] = base[index * 3 + 1]; target[index * 3 + 2] = base[index * 3 + 2];
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(target.slice(), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    geometry.setAttribute("aMatch", new THREE.BufferAttribute(match, 1));
    geometry.setAttribute("aExempt", new THREE.BufferAttribute(exempt, 1));
    geometry.setAttribute("aTerritory", new THREE.BufferAttribute(territoryIndex.map(Number), 1));
    geometry.computeBoundingSphere();
    t.points.geometry.dispose();
    t.points.geometry = geometry;
    t.base = base; t.target = target; t.territoryIndex = territoryIndex; t.proteinList = proteins;
    t.material.uniforms.uActiveTerritory.value = activeTerritory;
    t.material.uniforms.uTerritoryFocus.value = activeTerritory >= 0 ? 1 : 0;
    t.threadKey = "";
  }, [proteins]);

  // Recolor in place on theme change (no geometry rebuild needed).
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    const table = THEME_TABLE[theme];
    const colorAttr = t.points.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (colorAttr) {
      const territoryAttr = t.points.geometry.getAttribute("aTerritory") as THREE.BufferAttribute;
      for (let i = 0; i < colorAttr.count; i += 1) {
        const c = new THREE.Color(table.fam[territoryAttr.getX(i)] ?? table.fam[5]);
        colorAttr.setXYZ(i, c.r, c.g, c.b);
      }
      colorAttr.needsUpdate = true;
    }
    t.material.uniforms.uTheme.value = theme === "light" ? 0 : 1;
    t.material.uniforms.uFog.value.set(table.fog);
    t.material.uniforms.uFogNear.value = table.fogNear;
    t.material.uniforms.uFogFar.value = table.fogFar;
    t.material.uniforms.uSize.value = table.size;
    t.material.uniforms.uTeal.value.set(table.teal);
    t.material.uniforms.uGlow.value.set(table.glow);
    t.material.blending = table.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    t.material.needsUpdate = true;
    t.dishMaterial.uniforms.uTint.value.set(table.dishTint);
    t.dishMaterial.uniforms.uRim.value.set(table.dishRim);
  }, [theme]);

  // Selection/query highlight — recomputed whenever what's "primary" changes.
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    const matchAttr = t.points.geometry.getAttribute("aMatch") as THREE.BufferAttribute | undefined;
    if (!matchAttr) return;
    const primary = new Set(scene.queryResultIds);
    if (scene.selectedProteinId) primary.add(scene.selectedProteinId);
    for (let index = 0; index < t.proteinList.length; index += 1) matchAttr.setX(index, primary.has(t.proteinList[index].id) ? 1 : 0);
    matchAttr.needsUpdate = true;
  }, [scene.selectedProteinId, scene.queryResultIds, proteins]);

  // Camera choreography — driven by the exact command the SceneController just applied.
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    const cam = engine.current;
    const command = scene.lastCommand;
    if (!command) return;

    if (command === "ENTER_TERRITORY" && scene.territoryId) {
      cam.captureLevel("universe");
      const index = territories.findIndex((territory) => territory.id === scene.territoryId);
      const center = territoryCenter(index);
      applyTerritoryLayout(t, index);
      cam.applyTarget({ target: new THREE.Vector3(...center), r: 260, theta: cam.cam.theta, phi: 1.05 }, TWEEN_MS.enterTerritoryCamera);
    } else if (command === "SELECT_PROTEIN" && scene.selectedProteinId) {
      cam.captureLevel(scene.territoryId ? "territory" : "universe");
      const protein = t.proteinList.find((candidate) => candidate.id === scene.selectedProteinId);
      if (protein) {
        const point = new THREE.Vector3(...worldPosition(protein.position));
        t.dish.position.copy(point); t.dish.visible = true;
        cam.applyTarget({ target: point, r: 150, theta: cam.cam.theta, phi: 1.05 }, TWEEN_MS.selectProtein);
      }
    } else if (command === "INSPECT_STRUCTURE") {
      cam.captureLevel("protein");
      cam.applyTarget({ target: cam.cam.target.clone(), r: 90, theta: cam.cam.theta + 0.5, phi: 1.02 }, TWEEN_MS.inspectStructure);
    } else if (command === "START_DESIGN") {
      cam.applyTarget({ target: cam.cam.target.clone(), r: 100, theta: cam.cam.theta + 0.4, phi: 1.0 }, TWEEN_MS.startDesign);
    } else if (command === "EXIT_DESIGN") {
      cam.restoreLevel("protein", TWEEN_MS.returnToGlance);
    } else if (command === "RETURN_ONE_LEVEL" || command === "NAV_TO_LEVEL") {
      if (scene.mode === "glance") { t.dish.visible = true; cam.restoreLevel("protein", TWEEN_MS.returnToGlance); }
      else if (scene.mode === "territory" && scene.territoryId) {
        t.dish.visible = false;
        const index = territories.findIndex((territory) => territory.id === scene.territoryId);
        applyTerritoryLayout(t, index);
        if (!cam.restoreLevel("territory", TWEEN_MS.returnToTerritory)) {
          cam.applyTarget({ target: new THREE.Vector3(...territoryCenter(index)), r: 260, theta: cam.cam.theta, phi: 1.05 }, TWEEN_MS.returnToTerritory);
        }
      } else if (scene.mode === "universe") {
        t.dish.visible = false;
        applyTerritoryLayout(t, -1);
        cam.goHome(TWEEN_MS.returnToUniverseCamera);
        cam.clearLevels();
      }
    } else if (command === "RETURN_TO_UNIVERSE") {
      t.dish.visible = false;
      applyTerritoryLayout(t, -1);
      cam.goHome(TWEEN_MS.returnToUniverseCamera);
      cam.clearLevels();
    } else if (command === "QUERY_ATLAS") {
      t.dish.visible = false;
      const matches = scene.queryResultIds;
      if (matches.length) {
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let sumX = 0, sumY = 0, sumZ = 0, count = 0;
        const matchSet = new Set(matches);
        t.proteinList.forEach((protein, index) => {
          if (!matchSet.has(protein.id)) return;
          const x = t.base[index * 3], y = t.base[index * 3 + 1], z = t.base[index * 3 + 2];
          sumX += x; sumY += y; sumZ += z; count += 1;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        });
        if (count) {
          const center = new THREE.Vector3(sumX / count, sumY / count, sumZ / count);
          const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
          const r = THREE.MathUtils.clamp(span * 1.3 + 110, 160, 1500);
          cam.applyTarget({ target: center, r, theta: cam.cam.theta, phi: cam.cam.phi }, TWEEN_MS.queryMatch);
        }
      }
    } else if (command === "CLEAR_QUERY") {
      cam.applyTarget({ target: new THREE.Vector3(0, 0, 0), r: 900, theta: cam.cam.theta, phi: 1.12 }, TWEEN_MS.clearQuery);
    }
  }, [scene.lastCommand, scene.mode, scene.territoryId, scene.selectedProteinId, scene.queryResultIds]);

  useEffect(() => {
    const mount = container.current;
    if (!mount) return;

    const sceneObj = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, mount.clientWidth / Math.max(1, mount.clientHeight), CAMERA_NEAR, CAMERA_FAR);
    const cameraEngine = engine.current;
    cameraEngine.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sceneObj.add(new THREE.AmbientLight(0xffffff, 0.85));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const table = THEME_TABLE[themeRef.current];
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: table.size }, uPR: { value: renderer.getPixelRatio() },
        uFog: { value: new THREE.Color(table.fog) }, uFogNear: { value: table.fogNear }, uFogFar: { value: table.fogFar },
        uTheme: { value: themeRef.current === "light" ? 0 : 1 }, uTeal: { value: new THREE.Color(table.teal) }, uGlow: { value: new THREE.Color(table.glow) },
        uDim: { value: 1 }, uDimNon: { value: 1 }, uActiveTerritory: { value: -1 }, uTerritoryFocus: { value: 0 }, uTime: { value: 0 },
      },
      vertexShader: pointVertexShader, fragmentShader: pointFragmentShader,
      transparent: true, depthWrite: false, blending: table.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(new THREE.BufferGeometry(), material);
    sceneObj.add(points);

    const dishMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTint: { value: new THREE.Color(table.dishTint) }, uRim: { value: new THREE.Color(table.dishRim) },
        uOpacity: { value: 0.85 }, uLightDir: { value: new THREE.Vector2(0.5, 0.7) }, uPulse: { value: 0 },
      },
      vertexShader: dishVertexShader, fragmentShader: dishFragmentShader,
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(new THREE.CircleGeometry(1, 48), dishMaterial);
    dish.visible = false;
    dish.renderOrder = 10;
    sceneObj.add(dish);

    const threadGroup = new THREE.Group();
    sceneObj.add(threadGroup);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 2.6 };

    three.current = { renderer, sceneObj, camera, points, geometry: points.geometry, material, base: new Float32Array(0), target: new Float32Array(0), territoryIndex: new Int16Array(0), dish, dishMaterial, raycaster, threadGroup, proteinList: [], threadKey: "" };

    const pointer = new THREE.Vector2();
    let pointerDown = false; let panning = false; let moved = 0; let lastX = 0; let lastY = 0; let hoveredId: string | null = null; let moveThrottle = 0;
    let overTerritoryLabel = false;

    const overAnyTerritoryLabel = (clientX: number, clientY: number) => territoryLabelEls.current.some((el) => {
      if (!el || el.style.display === "none") return false;
      const rect = el.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    });

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const cursorWorld = () => {
      raycaster.setFromCamera(pointer, camera);
      return raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(engine.current.now.r));
    };
    const pickProtein = (): AtlasProtein | null => {
      const mode = sceneRef.current.mode;
      if (mode !== "universe" && mode !== "territory" && mode !== "glance") return null;
      raycaster.setFromCamera(pointer, camera);
      raycaster.params.Points!.threshold = Math.max(2.6, engine.current.now.r * 0.02);
      const hit = raycaster.intersectObject(points, false)[0];
      return hit?.index != null ? three.current!.proteinList[hit.index] ?? null : null;
    };

    const onPointerDown = (event: PointerEvent) => {
      mount.focus({ preventScroll: true });
      pointerDown = true; panning = event.button === 2 || event.button === 1 || event.shiftKey; moved = 0;
      lastX = event.clientX; lastY = event.clientY;
      engine.current.cancel();
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      if (pointerDown) {
        const dx = event.clientX - lastX; const dy = event.clientY - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (panning) engine.current.pan(dx, dy, camera.matrixWorld); else engine.current.orbit(dx, dy);
        lastX = event.clientX; lastY = event.clientY;
        return;
      }
      // Territory labels win over protein-hover reveal when the cursor has to choose.
      overTerritoryLabel = overAnyTerritoryLabel(event.clientX, event.clientY);
      if (overTerritoryLabel) {
        if (hoveredId !== null) { hoveredId = null; callbacks.current.onHoverProtein(null); }
        renderer.domElement.style.cursor = "pointer";
        return;
      }
      moveThrottle += 1;
      if (moveThrottle % 2 !== 0) return;
      const protein = pickProtein();
      const nextId = protein?.id ?? null;
      if (nextId !== hoveredId) {
        hoveredId = nextId;
        callbacks.current.onHoverProtein(protein);
        renderer.domElement.style.cursor = protein ? "pointer" : "grab";
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      pointerDown = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (moved > 6) return;
      if (overAnyTerritoryLabel(event.clientX, event.clientY)) return;
      updatePointer(event);
      const protein = pickProtein();
      if (protein) { callbacks.current.onSelectProtein(protein); return; }
      // A click that hit nothing while a protein is selected returns one level.
      if (sceneRef.current.mode === "glance") callbacks.current.onDeselect();
    };
    const onDoubleClick = (event: MouseEvent) => {
      if (sceneRef.current.mode !== "universe" && sceneRef.current.mode !== "territory") return;
      updatePointer(event as unknown as PointerEvent);
      engine.current.focusDoubleClick(cursorWorld());
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      updatePointer(event as unknown as PointerEvent);
      engine.current.dolly(event.deltaY, event.ctrlKey, cursorWorld());
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let animationFrame = 0; let lastTime = performance.now(); let metricFrames = 0; let metricStart = performance.now(); const startTime = performance.now();
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const currentScene = sceneRef.current;
      const ambientEligible = currentScene.mode === "universe" || currentScene.mode === "territory";
      const update = engine.current.update(dt, ambientEligible);
      camera.position.copy(update.position);
      camera.lookAt(update.target);
      material.uniforms.uTime.value = (now - startTime) / 1000;

      const targetDim = currentScene.mode === "inspect" ? 0.24 : currentScene.mode === "design" ? 0.06 : currentScene.mode === "glance" ? 0.55 : 1;
      material.uniforms.uDim.value += (targetDim - material.uniforms.uDim.value) * 0.08;
      const dimNonTarget = currentScene.queryResultIds.length || currentScene.selectedProteinId || material.uniforms.uTerritoryFocus.value > 0.5 ? THEME_TABLE[themeRef.current].dimNon : 1;
      material.uniforms.uDimNon.value += (dimNonTarget - material.uniforms.uDimNon.value) * 0.08;

      const t = three.current;
      if (t) {
        const positionAttr = t.points.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
        if (positionAttr) {
          const array = positionAttr.array as Float32Array;
          // Frame-rate independent: a flat per-frame factor would converge far too
          // slowly whenever the actual frame rate drops well below 60fps.
          const reflowFactor = 1 - Math.exp(-dt * 6.5);
          let changed = false;
          for (let i = 0; i < array.length; i += 1) {
            const delta = t.target[i] - array[i];
            if (Math.abs(delta) > 0.001) { array[i] += delta * reflowFactor; changed = true; }
          }
          if (changed) positionAttr.needsUpdate = true;
        }
        if (t.dish.visible) {
          const distance = camera.position.distanceTo(t.dish.position);
          t.dish.scale.setScalar(distance * 0.12);
          t.dish.quaternion.copy(camera.quaternion);
          const theta = engine.current.now.theta;
          t.dishMaterial.uniforms.uLightDir.value.set(Math.cos(theta * 0.6 + 0.8), Math.sin(theta * 0.6 + 0.8));
          t.dishMaterial.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(now * 0.0021);
        }

        // Relationship threads: rebuild only when the selection/toggle actually changes.
        const showThreads = currentScene.mode === "glance" && currentScene.threadsOn && !!currentScene.selectedProteinId;
        const threadKey = showThreads ? `${currentScene.selectedProteinId}` : "";
        if (threadKey !== t.threadKey) {
          rebuildThreadGroup(t, showThreads ? currentScene.selectedProteinId : null);
          t.threadKey = threadKey;
        }
        const threadTargetOpacity = showThreads ? 1 : 0;
        t.threadGroup.children.forEach((child) => {
          const lineMaterial = (child as THREE.Line).material as THREE.Material & { opacity: number };
          lineMaterial.opacity += (threadTargetOpacity * (lineMaterial.userData.baseOpacity ?? 1) - lineMaterial.opacity) * 0.15;
        });
      }

      renderer.render(sceneObj, camera);
      projectLabels(camera, mount, territoryLabelEls.current, currentScene, overTerritoryLabel ? null : hoveredId, proteinsRef.current, hoverLabelEl.current);

      metricFrames += 1;
      if (now - metricStart >= 1000) {
        callbacks.current.onMetrics({ fps: Math.round((metricFrames * 1000) / (now - metricStart)), visibleCount: three.current?.proteinList.length ?? 0 });
        metricFrames = 0; metricStart = now;
      }
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      points.geometry.dispose(); material.dispose();
      disposeThreadGroup(threadGroup);
      dish.geometry.dispose(); dishMaterial.dispose();
      renderer.dispose();
      three.current = null;
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <>
    <p id="atlas-navigation-help" className="hx-sr-only">Navigate the protein universe by left-drag to orbit, right-drag, middle-drag or shift-drag to pan, scroll to zoom toward the pointer, and double-click to focus. Escape returns one depth level.</p>
    <div className="hx-canvas-layer" ref={container} role="application" tabIndex={0} aria-label="Navigable spatial protein atlas" aria-describedby="atlas-navigation-help" />
    <div className="hx-labels" ref={labelsWrap}>
      {territories.map((territory, index) => <div
        key={territory.id}
        ref={(el) => { if (el) territoryLabelEls.current[index] = el; }}
        className="hx-label hx-label-territory hx-glass"
        style={{ display: "none" }}
        onClick={() => onEnterTerritory(territory.id)}
      >
        <div className="hx-label-eyebrow">TERRITORY {String(index + 1).padStart(2, "0")}</div>
        <div className="hx-label-name serif">{territory.label}</div>
        <div className="hx-label-enter mono">ENTER ›</div>
      </div>)}
      <div ref={hoverLabelEl} className="hx-label hx-label-hero" style={{ display: "none" }}>
        <div className="hx-label-hero-id mono" />
        <div className="hx-label-hero-name serif" />
      </div>
    </div>
  </>;
}

function applyTerritoryLayout(t: ThreeRefs, activeTerritory: number) {
  const center = activeTerritory >= 0 ? territoryCenter(activeTerritory) : null;
  for (let index = 0; index < t.proteinList.length; index += 1) {
    const idx = t.territoryIndex[index];
    if (center && idx === activeTerritory) {
      t.target[index * 3] = center[0] + (t.base[index * 3] - center[0]) * 1.7;
      t.target[index * 3 + 1] = center[1] + (t.base[index * 3 + 1] - center[1]) * 1.7;
      t.target[index * 3 + 2] = center[2] + (t.base[index * 3 + 2] - center[2]) * 1.7;
    } else {
      t.target[index * 3] = t.base[index * 3]; t.target[index * 3 + 1] = t.base[index * 3 + 1]; t.target[index * 3 + 2] = t.base[index * 3 + 2];
    }
  }
  t.material.uniforms.uActiveTerritory.value = activeTerritory;
  t.material.uniforms.uTerritoryFocus.value = activeTerritory >= 0 ? 1 : 0;
}

function rebuildThreadGroup(t: ThreeRefs, selectedProteinId: string | null) {
  disposeThreadChildren(t.threadGroup);
  const exemptAttr = t.points.geometry.getAttribute("aExempt") as THREE.BufferAttribute | undefined;
  if (exemptAttr) { for (let i = 0; i < exemptAttr.count; i += 1) exemptAttr.setX(i, 0); }
  if (!selectedProteinId) { if (exemptAttr) exemptAttr.needsUpdate = true; return; }
  const selected = t.proteinList.find((protein) => protein.id === selectedProteinId);
  if (!selected) { if (exemptAttr) exemptAttr.needsUpdate = true; return; }
  const threads = computeRelationshipThreads(selected, t.proteinList, THREAD_LIMIT);
  const from = new THREE.Vector3(...worldPosition(selected.position));
  const relatedIds = new Set(threads.map((thread) => thread.protein.id));
  if (exemptAttr) {
    t.proteinList.forEach((protein, index) => { if (relatedIds.has(protein.id)) exemptAttr.setX(index, 1); });
    exemptAttr.needsUpdate = true;
  }
  threads.forEach((thread, index) => {
    const to = new THREE.Vector3(...worldPosition(thread.protein.position));
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y += 30 + index * 10;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
    const lineMaterial = new THREE.LineBasicMaterial({ color: "#0c8c78", transparent: true, opacity: 0 });
    lineMaterial.userData.baseOpacity = 0.7;
    const line = new THREE.Line(lineGeometry, lineMaterial);
    t.threadGroup.add(line);
  });
}

function disposeThreadChildren(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children.pop()!;
    (child as THREE.Line).geometry?.dispose();
    ((child as THREE.Line).material as THREE.Material)?.dispose();
  }
}

function disposeThreadGroup(group: THREE.Group) {
  disposeThreadChildren(group);
}

function projectLabels(camera: THREE.PerspectiveCamera, mount: HTMLDivElement, territoryEls: HTMLDivElement[], scene: SceneState, hoveredId: string | null, proteins: AtlasProtein[], hoverLabel: HTMLDivElement | null) {
  const width = mount.clientWidth; const height = mount.clientHeight;
  const showTerritories = scene.mode === "universe" || scene.mode === "territory";
  const projected = new THREE.Vector3();
  // The query bar (top:78px, right:26px, width min(660, 66vw), plus its results/suggestions
  // row) sits above the world and is itself interactive — a territory label projected under
  // it would lose the click to the query bar's own buttons/chips. Nudge below instead of
  // fighting a z-order battle between two legitimately-interactive elements.
  const queryRight = width - 26;
  const queryLeft = queryRight - Math.min(660, width * 0.66);
  const queryTop = 78; const queryBottom = 230;
  const labelHalfW = 105; const labelHalfH = 40;
  territories.forEach((territory, index) => {
    const el = territoryEls[index];
    if (!el) return;
    const center = territoryCenter(index);
    projected.set(center[0], center[1] + (scene.territoryId === territory.id ? center[1] * 0.7 : 0), center[2]).project(camera);
    const onscreen = projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05;
    if (showTerritories && onscreen) {
      const left = (projected.x * 0.5 + 0.5) * width;
      let top = (-projected.y * 0.5 + 0.5) * height;
      const overlapsQuery = left + labelHalfW > queryLeft && left - labelHalfW < queryRight && top + labelHalfH > queryTop && top - labelHalfH < queryBottom;
      if (overlapsQuery) top = queryBottom + labelHalfH + 12;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.display = "block";
      el.style.opacity = scene.mode === "territory" ? (scene.territoryId === territory.id ? "1" : "0.12") : "1";
    } else {
      el.style.display = "none";
    }
  });
  if (hoverLabel) {
    const protein = hoveredId ? proteins.find((candidate) => candidate.id === hoveredId) ?? null : null;
    if (protein && (scene.mode === "universe" || scene.mode === "territory" || scene.mode === "glance")) {
      projected.set(...worldPosition(protein.position)).project(camera);
      if (projected.z < 1) {
        hoverLabel.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        hoverLabel.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
        hoverLabel.style.display = "block";
        const idEl = hoverLabel.querySelector(".hx-label-hero-id"); if (idEl) idEl.textContent = protein.id;
        const nameEl = hoverLabel.querySelector(".hx-label-hero-name"); if (nameEl) nameEl.textContent = protein.name;
      } else hoverLabel.style.display = "none";
    } else hoverLabel.style.display = "none";
  }
}
