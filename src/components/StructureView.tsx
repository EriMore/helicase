"use client";

import { useEffect, useRef, useState } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { Color } from "molstar/lib/mol-util/color";
import { createRoot, type Root } from "react-dom/client";
import type { StructureReference } from "@/domain/atlas-data";

type StructureViewProps = { active: boolean; structure: StructureReference | null };

const AtlasViewportControls = () => null;

export function StructureView({ active, structure: structureReference }: StructureViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    if (!active || !host.current || !structureReference) return;
    let disposed = false;
    let plugin: Awaited<ReturnType<typeof createPluginUI>> | undefined;
    let reactRoot: Root | undefined;
    const target = document.createElement("div");
    target.className = "structure-molstar-root";
    host.current.appendChild(target);

    let cleanupQueued = false;
    const disposeInstance = () => {
      if (cleanupQueued) return;
      cleanupQueued = true;
      const pluginToDispose = plugin;
      const rootToUnmount = reactRoot;
      // Mol* owns a second React root. Defer its teardown until the parent
      // Atlas render has committed to avoid nested synchronous unmounts.
      window.setTimeout(() => {
        pluginToDispose?.dispose();
        rootToUnmount?.unmount();
        target.remove();
      }, 0);
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
        const experimental = structureReference.kind === "experimental";
        const data = await plugin.builders.data.download(
          {
            url: experimental
              ? `https://models.rcsb.org/${structureReference.accession.toLowerCase()}.bcif`
              : `https://alphafold.ebi.ac.uk/files/AF-${structureReference.accession}-F1-model_v6.cif`,
            isBinary: experimental,
          },
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
  }, [active, structureReference]);

  if (!active || !structureReference) return null;
  return <div className="structure-view" aria-label={`Molecular view for ${structureReference.accession}`}>
    <div className="structure-canvas" ref={host} />
    <p className={`structure-status ${status}`}>{status === "ready" ? `${structureReference.source} ${structureReference.accession} · Mol*` : status === "loading" ? "Resolving cited coordinates…" : "Structure service unavailable · universe remains navigable"}</p>
  </div>;
}
