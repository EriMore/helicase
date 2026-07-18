"use client";

import { useEffect, useRef, useState } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";

type StructureViewProps = { active: boolean; accession: string };

export function StructureView({ active, accession }: StructureViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    if (!active || !host.current) return;
    let disposed = false;
    let plugin: Awaited<ReturnType<typeof createPluginUI>> | undefined;

    const initialize = async () => {
      try {
        const spec = DefaultPluginUISpec();
        spec.components = { ...spec.components, controls: { top: "none", left: "none", right: "none", bottom: "none" }, remoteState: "none" };
        plugin = await createPluginUI({ target: host.current!, spec, render: renderReact18 });
        const data = await plugin.builders.data.download(
          { url: `https://models.rcsb.org/${accession.toLowerCase()}.bcif` },
          { state: { isGhost: true } },
        );
        const trajectory = await plugin.builders.structure.parseTrajectory(data, "mmcif");
        await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
        if (!disposed) setStatus("ready");
      } catch {
        if (!disposed) setStatus("unavailable");
      }
    };

    void initialize();
    return () => { disposed = true; plugin?.dispose(); };
  }, [accession, active]);

  if (!active) return null;
  return <div className="structure-view" aria-label={`Molecular view for ${accession}`}>
    <div className="structure-canvas" ref={host} />
    <p className={`structure-status ${status}`}>{status === "ready" ? `RCSB ${accession} · Mol*` : status === "loading" ? "Loading cited structure…" : "Structure service unavailable · scene remains usable"}</p>
  </div>;
}
