"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SceneState } from "@/domain/atlas";
import type { AtlasProtein } from "@/domain/atlas-data";
import { territories, territoryCenter, territoryIndexForRegion } from "@/domain/territories";
import { CAMERA_FAR, CAMERA_FOV, CAMERA_NEAR, CameraEngine, TWEEN_MS } from "@/engine/camera-navigation";

export type Theme = "light" | "dark";
export type WorldMetrics = { fps: number; visibleCount: number };

const THEME_TABLE: Record<Theme, { fam: string[]; teal: string; fog: string; fogNear: number; fogFar: number; size: number; additive: boolean; dimNon: number }> = {
  light: { fam: ["#3c5a86", "#8f4a44", "#3f6f60", "#9a7a34", "#6a4a70", "#4a4f57"], teal: "#0c8c78", fog: "#efece4", fogNear: 300, fogFar: 1200, size: 22, additive: false, dimNon: 0.30 },
  dark: { fam: ["#7d97d0", "#d68b83", "#5fc6a6", "#d9b96e", "#b490c8", "#9aa2b0"], teal: "#34d6b8", fog: "#0d1013", fogNear: 440, fogFar: 2400, size: 26, additive: true, dimNon: 0.26 },
};

const pointVertexShader = `
attribute vec3 color;
attribute float aScale;
attribute float aMatch;
attribute float aTerritory;
uniform float uSize, uPR, uFogNear, uFogFar;
varying vec3 vColor;
varying float vFog, vMatch, vTerritory;
void main() {
  vColor = color; vMatch = aMatch; vTerritory = aTerritory;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aScale * uSize * uPR * (300.0 / -mv.z), 26.0 * uPR);
  float d = -mv.z;
  vFog = clamp((d - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const pointFragmentShader = `
precision mediump float;
varying vec3 vColor; varying float vFog, vMatch, vTerritory;
uniform vec3 uFog, uTeal; uniform float uTheme, uDim, uDimNon, uActiveTerritory, uTerritoryFocus;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = smoothstep(0.5, 0.24, d);
  if (a <= 0.002) discard;
  vec3 c = mix(vColor, uTeal, vMatch * 0.9);
  float fogMix = uTheme < 0.5 ? 0.9 : 0.35;
  c = mix(c, uFog, vFog * fogMix);
  float alpha = a;
  alpha *= mix(1.0, 1.0 - vFog * 0.82, step(uTheme, 0.5));
  alpha *= uDim;
  alpha *= mix(uDimNon, 1.0, vMatch);
  if (uTerritoryFocus > 0.5) { float m = abs(vTerritory - uActiveTerritory) < 0.5 ? 1.0 : uDimNon; alpha *= m; }
  gl_FragColor = vec4(c, alpha);
}`;

type ThreeRefs = {
  renderer: THREE.WebGLRenderer; sceneObj: THREE.Scene; camera: THREE.PerspectiveCamera;
  points: THREE.Points; geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial;
  base: Float32Array; target: Float32Array; territoryIndex: Int16Array;
  marker: THREE.Sprite; raycaster: THREE.Raycaster;
  proteinList: AtlasProtein[];
  reflow: { active: boolean };
};

function makeBracketTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6; ctx.lineCap = "square";
  const pad = 18; const len = 30; const size = 128;
  const corners: Array<[number, number, number, number]> = [[pad, pad, 1, 1], [size - pad, pad, -1, 1], [pad, size - pad, 1, -1], [size - pad, size - pad, -1, -1]];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * len, cy);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

type WorldCanvasProps = {
  theme: Theme;
  scene: SceneState;
  proteins: AtlasProtein[];
  onSelectProtein: (protein: AtlasProtein) => void;
  onEnterTerritory: (territoryId: string) => void;
  onHoverProtein: (protein: AtlasProtein | null) => void;
  onMetrics: (metrics: WorldMetrics) => void;
};

export function WorldCanvas({ theme, scene, proteins, onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics }: WorldCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const labelsWrap = useRef<HTMLDivElement>(null);
  const territoryLabelEls = useRef<HTMLDivElement[]>([]);
  const hoverLabelEl = useRef<HTMLDivElement | null>(null);

  const engine = useRef(new CameraEngine());
  const sceneRef = useRef(scene);
  const themeRef = useRef(theme);
  const proteinsRef = useRef(proteins);
  const callbacks = useRef({ onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics });

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { proteinsRef.current = proteins; }, [proteins]);
  useEffect(() => { callbacks.current = { onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics }; }, [onSelectProtein, onEnterTerritory, onHoverProtein, onMetrics]);

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
    const territoryIndex = new Int16Array(count);
    const table = THEME_TABLE[themeRef.current];
    const highlighted = new Set(sceneRef.current.queryResultIds);
    const activeTerritory = territories.findIndex((territory) => territory.id === sceneRef.current.territoryId);
    proteins.forEach((protein, index) => {
      base[index * 3] = protein.position[0]; base[index * 3 + 1] = protein.position[1]; base[index * 3 + 2] = protein.position[2];
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
    geometry.setAttribute("aTerritory", new THREE.BufferAttribute(territoryIndex.map(Number), 1));
    geometry.computeBoundingSphere();
    t.points.geometry.dispose();
    t.points.geometry = geometry;
    t.base = base; t.target = target; t.territoryIndex = territoryIndex; t.proteinList = proteins;
    t.material.uniforms.uActiveTerritory.value = activeTerritory;
    t.material.uniforms.uTerritoryFocus.value = activeTerritory >= 0 ? 1 : 0;
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
    t.material.blending = table.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    t.material.needsUpdate = true;
    t.marker.material.color.set(table.teal);
  }, [theme]);

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
        const point = new THREE.Vector3(...protein.position);
        t.marker.position.copy(point); t.marker.visible = true;
        cam.applyTarget({ target: point, r: 150, theta: cam.cam.theta, phi: 1.05 }, TWEEN_MS.selectProtein);
      }
    } else if (command === "INSPECT_STRUCTURE") {
      cam.captureLevel("protein");
      t.marker.visible = false;
      cam.applyTarget({ target: cam.cam.target.clone(), r: 90, theta: cam.cam.theta + 0.5, phi: 1.02 }, TWEEN_MS.inspectStructure);
    } else if (command === "START_DESIGN") {
      cam.applyTarget({ target: cam.cam.target.clone(), r: 100, theta: cam.cam.theta + 0.4, phi: 1.0 }, TWEEN_MS.startDesign);
    } else if (command === "EXIT_DESIGN") {
      cam.restoreLevel("protein", TWEEN_MS.returnToGlance);
    } else if (command === "RETURN_ONE_LEVEL" || command === "NAV_TO_LEVEL") {
      if (scene.mode === "glance") { t.marker.visible = true; cam.restoreLevel("protein", TWEEN_MS.returnToGlance); }
      else if (scene.mode === "territory" && scene.territoryId) {
        t.marker.visible = false;
        const index = territories.findIndex((territory) => territory.id === scene.territoryId);
        applyTerritoryLayout(t, index);
        if (!cam.restoreLevel("territory", TWEEN_MS.returnToTerritory)) {
          cam.applyTarget({ target: new THREE.Vector3(...territoryCenter(index)), r: 260, theta: cam.cam.theta, phi: 1.05 }, TWEEN_MS.returnToTerritory);
        }
      } else if (scene.mode === "universe") {
        t.marker.visible = false;
        applyTerritoryLayout(t, -1);
        cam.goHome(TWEEN_MS.returnToUniverseCamera);
        cam.clearLevels();
      }
    } else if (command === "RETURN_TO_UNIVERSE") {
      t.marker.visible = false;
      applyTerritoryLayout(t, -1);
      cam.goHome(TWEEN_MS.returnToUniverseCamera);
      cam.clearLevels();
    } else if (command === "QUERY_ATLAS") {
      t.marker.visible = false;
      const matches = new Set(scene.queryResultIds);
      applyQueryLayout(t, matches);
      if (matches.size) {
        let sumX = 0, sumY = 0, sumZ = 0, matched = 0;
        t.proteinList.forEach((protein, index) => { if (matches.has(protein.id)) { sumX += t.target[index * 3]; sumY += t.target[index * 3 + 1]; sumZ += t.target[index * 3 + 2]; matched += 1; } });
        const center = matched ? new THREE.Vector3(sumX / matched, sumY / matched, sumZ / matched) : new THREE.Vector3();
        cam.applyTarget({ target: center, r: 380, theta: 0.4, phi: 1.12 }, TWEEN_MS.queryMatch);
      }
    } else if (command === "CLEAR_QUERY") {
      applyQueryLayout(t, new Set());
      cam.applyTarget({ target: new THREE.Vector3(0, 0, 0), r: 600, theta: cam.cam.theta, phi: 1.12 }, TWEEN_MS.clearQuery);
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
        uTheme: { value: themeRef.current === "light" ? 0 : 1 }, uTeal: { value: new THREE.Color(table.teal) },
        uDim: { value: 1 }, uDimNon: { value: 1 }, uActiveTerritory: { value: -1 }, uTerritoryFocus: { value: 0 },
      },
      vertexShader: pointVertexShader, fragmentShader: pointFragmentShader,
      transparent: true, depthWrite: false, blending: table.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(new THREE.BufferGeometry(), material);
    sceneObj.add(points);

    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeBracketTexture(), color: table.teal, transparent: true, opacity: 0.85, depthTest: false }));
    marker.visible = false;
    sceneObj.add(marker);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 2.6 };

    three.current = { renderer, sceneObj, camera, points, geometry: points.geometry, material, base: new Float32Array(0), target: new Float32Array(0), territoryIndex: new Int16Array(0), marker, raycaster, proteinList: [], reflow: { active: false } };

    const pointer = new THREE.Vector2();
    let pointerDown = false; let panning = false; let moved = 0; let lastX = 0; let lastY = 0; let hoveredId: string | null = null; let moveThrottle = 0;

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
      if (sceneRef.current.mode !== "universe" && sceneRef.current.mode !== "territory") return null;
      raycaster.setFromCamera(pointer, camera);
      raycaster.params.Points!.threshold = engine.current.now.r * 0.02;
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
      updatePointer(event);
      const protein = pickProtein();
      if (protein) { callbacks.current.onSelectProtein(protein); return; }
      if (sceneRef.current.mode === "universe" || sceneRef.current.mode === "territory") {
        // A click that hit neither a protein nor a territory label is a deliberate miss — stay put.
      }
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

    let animationFrame = 0; let lastTime = performance.now(); let metricFrames = 0; let metricStart = performance.now();
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const currentScene = sceneRef.current;
      const ambientEligible = currentScene.mode === "universe" || currentScene.mode === "territory";
      const update = engine.current.update(dt, ambientEligible);
      camera.position.copy(update.position);
      camera.lookAt(update.target);

      const targetDim = currentScene.mode === "inspect" || currentScene.mode === "design" ? 0.24 : currentScene.mode === "glance" ? 0.6 : 1;
      material.uniforms.uDim.value += (targetDim - material.uniforms.uDim.value) * 0.08;
      const dimNonTarget = currentScene.queryResultIds.length || material.uniforms.uTerritoryFocus.value > 0.5 ? THEME_TABLE[themeRef.current].dimNon : 1;
      material.uniforms.uDimNon.value += (dimNonTarget - material.uniforms.uDimNon.value) * 0.08;

      const t = three.current;
      if (t) {
        const positionAttr = t.points.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
        if (positionAttr) {
          const array = positionAttr.array as Float32Array;
          let changed = false;
          for (let i = 0; i < array.length; i += 1) {
            const delta = t.target[i] - array[i];
            if (Math.abs(delta) > 0.001) { array[i] += delta * 0.08; changed = true; }
          }
          if (changed) positionAttr.needsUpdate = true;
        }
        if (t.marker.visible) {
          const distance = camera.position.distanceTo(t.marker.position);
          t.marker.scale.setScalar(distance * 0.09);
          t.marker.material.opacity = 0.7 + Math.sin(now * 0.004) * 0.3;
        }
      }

      renderer.render(sceneObj, camera);
      projectLabels(camera, mount, engine.current, territoryLabelEls.current, currentScene, hoveredId, proteinsRef.current, hoverLabelEl.current);

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
      (marker.material as THREE.SpriteMaterial).map?.dispose();
      (marker.material as THREE.Material).dispose();
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
        className="hx-label hx-label-territory"
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

function applyQueryLayout(t: ThreeRefs, matches: Set<string>) {
  const matchAttr = t.points.geometry.getAttribute("aMatch") as THREE.BufferAttribute | undefined;
  for (let index = 0; index < t.proteinList.length; index += 1) {
    const isMatch = matches.has(t.proteinList[index].id);
    if (matchAttr) matchAttr.setX(index, isMatch ? 1 : 0);
    if (matches.size === 0) { t.target[index * 3] = t.base[index * 3]; t.target[index * 3 + 1] = t.base[index * 3 + 1]; t.target[index * 3 + 2] = t.base[index * 3 + 2]; continue; }
    if (isMatch) {
      t.target[index * 3] = t.base[index * 3]; t.target[index * 3 + 1] = t.base[index * 3 + 1] + 10; t.target[index * 3 + 2] = t.base[index * 3 + 2] * 0.4;
    } else {
      const length = Math.hypot(t.base[index * 3], t.base[index * 3 + 1], t.base[index * 3 + 2]) || 1;
      const push = 130 / length;
      t.target[index * 3] = t.base[index * 3] * (1 + push); t.target[index * 3 + 1] = t.base[index * 3 + 1] * (1 + push); t.target[index * 3 + 2] = t.base[index * 3 + 2] * (1 + push);
    }
  }
  if (matchAttr) matchAttr.needsUpdate = true;
}

function projectLabels(camera: THREE.PerspectiveCamera, mount: HTMLDivElement, cameraEngine: CameraEngine, territoryEls: HTMLDivElement[], scene: SceneState, hoveredId: string | null, proteins: AtlasProtein[], hoverLabel: HTMLDivElement | null) {
  const width = mount.clientWidth; const height = mount.clientHeight;
  const showTerritories = scene.mode === "universe" || scene.mode === "territory";
  const projected = new THREE.Vector3();
  territories.forEach((territory, index) => {
    const el = territoryEls[index];
    if (!el) return;
    const center = territoryCenter(index);
    projected.set(center[0], center[1] + (scene.territoryId === territory.id ? center[1] * 0.7 : 0), center[2]).project(camera);
    const onscreen = projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05;
    if (showTerritories && onscreen) {
      el.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      el.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      el.style.display = "block";
      el.style.opacity = scene.mode === "territory" ? (scene.territoryId === territory.id ? "1" : "0.12") : "1";
    } else {
      el.style.display = "none";
    }
  });
  if (hoverLabel) {
    const protein = hoveredId ? proteins.find((candidate) => candidate.id === hoveredId) ?? null : null;
    if (protein && (scene.mode === "universe" || scene.mode === "territory")) {
      projected.set(...protein.position).project(camera);
      if (projected.z < 1) {
        hoverLabel.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        hoverLabel.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
        hoverLabel.style.display = "block";
        const idEl = hoverLabel.querySelector(".hx-label-hero-id"); if (idEl) idEl.textContent = protein.id;
        const nameEl = hoverLabel.querySelector(".hx-label-hero-name"); if (nameEl) nameEl.textContent = protein.name;
      } else hoverLabel.style.display = "none";
    } else hoverLabel.style.display = "none";
  }
  void cameraEngine;
}
