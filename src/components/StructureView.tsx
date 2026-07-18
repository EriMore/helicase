"use client";

import { useEffect, useRef, useState } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { Color } from "molstar/lib/mol-util/color";
import { createRoot, type Root } from "react-dom/client";

type StructureViewProps = { active: boolean; accession: string };

const AtlasViewportControls = () => null;

export function StructureView({ active, accession }: StructureViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    if (!active || !host.current) return;
    let disposed = false;
    let plugin: Awaited<ReturnType<typeof createPluginUI>> | undefined;
    let reactRoot: Root | undefined;
    const target = document.createElement("div");
    target.className = "structure-molstar-root";
    host.current.appendChild(target);

    const disposeInstance = () => {
      plugin?.dispose();
      reactRoot?.unmount();
      target.remove();
    };

    const initialize = async () => {
      try {
        setStatus("loading");
        const spec = DefaultPluginUISpec();
        spec.components = {
          ...spec.components,
          controls: { top: "none", left: "none", right: "none", bottom: "none" },
          remoteState: "none",
          hideTaskOverlay: true,
          disableDragOverlay: true,
          viewport: { ...spec.components?.viewport, controls: AtlasViewportControls },
        };
        plugin = await createPluginUI({
          target,
          spec,
          render: (element, mountTarget) => {
            reactRoot = createRoot(mountTarget);
            reactRoot.render(element);
          },
        });
        if (disposed) {
          disposeInstance();
          return;
        }
        plugin.canvas3d?.setProps({
          transparentBackground: true,
          camera: { mode: "perspective", fov: 38, manualReset: false },
          cameraFog: { name: "off", params: {} },
          renderer: {
            backgroundColor: Color(0x03050b),
            exposure: 0.72,
            ambientIntensity: 0.46,
            interiorDarkening: 0.42,
          },
          postprocessing: {
            bloom: { name: "off", params: {} },
            dof: { name: "off", params: {} },
            outline: { name: "off", params: {} },
          },
          trackball: {
            rotateSpeed: 0.7,
            zoomSpeed: 0.75,
            panSpeed: 0.6,
            animate: { name: "off", params: {} },
          },
        });
        const data = await plugin.builders.data.download(
          { url: `https://models.rcsb.org/${accession.toLowerCase()}.bcif`, isBinary: true },
          { state: { isGhost: true } },
        );
        if (disposed) return;
        const trajectory = await plugin.builders.structure.parseTrajectory(data, "mmcif");
        if (disposed) return;
        const model = await plugin.builders.structure.createModel(trajectory);
        if (disposed) return;
        const structure = await plugin.builders.structure.createStructure(model);
        if (disposed) return;
        const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, "polymer");
        if (polymer) {
          await plugin.builders.structure.representation.addRepresentation(polymer, {
            type: "cartoon",
            color: "uniform",
            colorParams: { value: Color(0x78d8ff) },
            typeParams: { alpha: 1, quality: "high" },
          });
        }
        const ligand = await plugin.builders.structure.tryCreateComponentStatic(structure, "ligand");
        if (ligand) {
          await plugin.builders.structure.representation.addRepresentation(ligand, {
            type: "ball-and-stick",
            color: "element-symbol",
            typeParams: { alpha: 1, quality: "high" },
          });
        }
        plugin.canvas3d?.requestResize();
        plugin.canvas3d?.requestCameraReset({ durationMs: 0 });
        window.requestAnimationFrame(() => {
          if (disposed) return;
          plugin?.canvas3d?.requestResize();
          plugin?.canvas3d?.requestCameraReset({ durationMs: 0 });
        });
        if (!disposed) setStatus("ready");
      } catch {
        if (!disposed) setStatus("unavailable");
      }
    };

    void initialize();
    return () => { disposed = true; disposeInstance(); };
  }, [accession, active]);

  if (!active) return null;
  return <div className="structure-view" aria-label={`Molecular view for ${accession}`}>
    <div className="structure-canvas" ref={host} />
    <p className={`structure-status ${status}`}>{status === "ready" ? `RCSB ${accession} · Mol*` : status === "loading" ? "Loading cited structure…" : "Structure service unavailable · scene remains usable"}</p>
  </div>;
}
