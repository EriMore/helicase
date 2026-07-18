"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SceneMode } from "@/domain/atlas";

type WorldCanvasProps = { mode: SceneMode; designProgress: number };

const createHelix = (radius: number, phase: number) => new THREE.CatmullRomCurve3(Array.from({ length: 80 }, (_, index) => {
  const t = (index / 79) * Math.PI * 5;
  return new THREE.Vector3(Math.cos(t + phase) * radius, (index - 40) * 0.07, Math.sin(t + phase) * radius);
}));

export function WorldCanvas({ mode, designProgress }: WorldCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const activeMode = useRef(mode);
  const progress = useRef(designProgress);
  useEffect(() => { activeMode.current = mode; }, [mode]);
  useEffect(() => { progress.current = designProgress; }, [designProgress]);

  useEffect(() => {
    const mount = container.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#03050b", 0.021);
    const camera = new THREE.PerspectiveCamera(47, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.8, 15);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor("#03050b", 1);
    mount.appendChild(renderer.domElement);

    const starCount = 2600;
    const stars = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [new THREE.Color("#77d8ff"), new THREE.Color("#a99bff"), new THREE.Color("#f6b65b"), new THREE.Color("#eaf7ff")];
    for (let i = 0; i < starCount; i += 1) {
      const radius = 12 + Math.pow(Math.random(), 0.42) * 100;
      const theta = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.82;
      stars[i * 3] = Math.cos(theta) * Math.cos(elevation) * radius;
      stars[i * 3 + 1] = Math.sin(elevation) * radius * 0.55;
      stars[i * 3 + 2] = Math.sin(theta) * Math.cos(elevation) * radius;
      const color = palette[i % palette.length];
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const starMaterial = new THREE.PointsMaterial({ size: 0.24, vertexColors: true, transparent: true, opacity: 0.82, sizeAttenuation: true });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    const molecule = new THREE.Group();
    const structureMaterial = new THREE.MeshBasicMaterial({ color: "#87dbff", transparent: true, opacity: 0.92 });
    const doubtMaterial = new THREE.MeshBasicMaterial({ color: "#ffb259", transparent: true, opacity: 0.68 });
    [0, 1.8, 3.6, 5.4].forEach((phase, index) => {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(createHelix(1.55 - index * 0.16, phase), 150, 0.12, 10, false), index === 3 ? doubtMaterial : structureMaterial);
      tube.rotation.z = (index - 1.5) * 0.38;
      molecule.add(tube);
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.12, 3), new THREE.MeshBasicMaterial({ color: "#dff7ff", wireframe: true, transparent: true, opacity: 0.32 }));
    molecule.add(core); molecule.visible = false; scene.add(molecule);

    const designCount = 480;
    const finalPositions = new Float32Array(designCount * 3);
    const noisePositions = new Float32Array(designCount * 3);
    for (let i = 0; i < designCount; i += 1) {
      const t = i / designCount * Math.PI * 8;
      finalPositions[i * 3] = Math.cos(t) * (0.75 + 0.18 * Math.cos(t * 3));
      finalPositions[i * 3 + 1] = (i / designCount - 0.5) * 4.5;
      finalPositions[i * 3 + 2] = Math.sin(t) * (0.75 + 0.18 * Math.cos(t * 3));
      noisePositions[i * 3] = (Math.random() - 0.5) * 6;
      noisePositions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      noisePositions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const livePositions = new Float32Array(noisePositions);
    const designGeometry = new THREE.BufferGeometry();
    designGeometry.setAttribute("position", new THREE.BufferAttribute(livePositions, 3));
    const design = new THREE.Points(designGeometry, new THREE.PointsMaterial({ color: "#aa86ff", size: 0.105, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending }));
    design.visible = false; design.position.set(3.2, 0, 0.4); scene.add(design);

    const onResize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    window.addEventListener("resize", onResize);
    const clock = new THREE.Clock(); let frame = 0;
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const isMap = activeMode.current === "map";
      const isDive = activeMode.current === "diving";
      const isXray = activeMode.current === "xray";
      const isDesign = activeMode.current === "designing" || activeMode.current === "designComplete";
      starField.rotation.y = elapsed * 0.008; starField.rotation.x = Math.sin(elapsed * 0.06) * 0.07; starMaterial.opacity = isMap ? 0.82 : 0.18;
      molecule.visible = isDive; molecule.rotation.y = elapsed * 0.15; molecule.rotation.x = Math.sin(elapsed * 0.13) * 0.09;
      molecule.scale.setScalar(isMap ? 0.001 : isDive ? 0.8 : 1); core.visible = !isXray; doubtMaterial.opacity = isXray ? 0.32 + Math.sin(elapsed * 3.3) * 0.16 : 0.68;
      design.visible = isDesign;
      if (isDesign) { const p = progress.current / 100; for (let i = 0; i < livePositions.length; i += 1) livePositions[i] = THREE.MathUtils.lerp(noisePositions[i], finalPositions[i], p); designGeometry.attributes.position.needsUpdate = true; design.rotation.y = -elapsed * 0.5; }
      camera.position.z = isMap ? 15 : isDesign ? 11 : 8.4; camera.position.x = isDesign ? -1.5 : 0; camera.lookAt(isDesign ? 1.2 : 0, 0, 0);
      renderer.render(scene, camera); frame = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); renderer.dispose(); starGeometry.dispose(); designGeometry.dispose(); mount.removeChild(renderer.domElement); };
  }, []);
  return <div aria-hidden="true" className="world-canvas" ref={container} />;
}
