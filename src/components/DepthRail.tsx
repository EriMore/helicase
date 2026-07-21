"use client";

import type { SceneMode } from "@/domain/atlas";

type Level = { key: "universe" | "cluster" | "protein" | "structure" | "de-novo"; label: string };
const LEVELS: Level[] = [
  { key: "universe", label: "UNIVERSE" },
  { key: "cluster", label: "CLUSTER" },
  { key: "protein", label: "PROTEIN" },
  { key: "structure", label: "STRUCTURE" },
  { key: "de-novo", label: "DE NOVO" },
];

type DepthRailProps = {
  mode: SceneMode;
  visible: boolean;
  clusterLabel: string | null;
  proteinName: string | null;
  structureLabel: string | null;
  onNavigate: (level: "universe" | "cluster" | "protein" | "structure") => void;
};

function currentDepth(mode: SceneMode): number {
  if (mode === "design") return 4;
  if (mode === "inspect") return 3;
  if (mode === "glance") return 2;
  if (mode === "cluster") return 1;
  return 0;
}

export function DepthRail({ mode, visible, clusterLabel, proteinName, structureLabel, onNavigate }: DepthRailProps) {
  const depth = currentDepth(mode);
  return (
    <nav aria-label="Spatial depth" className="hx-rail hx-glass" style={{ opacity: visible ? 1 : 0 }}>
      <div className="hx-rail-title mono">DEPTH</div>
      {LEVELS.map((level, index) => {
        const active = index === depth;
        const reachable = index < depth;
        const sub = level.key === "cluster" ? clusterLabel : level.key === "protein" ? proteinName : level.key === "structure" ? structureLabel : null;
        // "De novo" has no direct jump-to command — it is only ever reached by starting
        // the design journey from Structure, so it renders active-only, never clickable.
        const clickable = level.key !== "de-novo" && (reachable || active);
        const state = active ? "active" : level.key === "de-novo" ? "unavailable" : reachable ? "available" : "unavailable";
        return (
          <button
            key={level.key}
            className={`hx-rail-level hx-rail-level--${state}`}
            disabled={!clickable}
            onClick={() => { if (clickable && level.key !== "de-novo") onNavigate(level.key); }}
          >
            <span className="hx-rail-dotwrap">
              <span className="hx-rail-dot" />
            </span>
            <span className="hx-rail-textwrap">
              <span className="hx-rail-label mono">{level.label}</span>
              {sub && <span className="hx-rail-sub">{sub}</span>}
            </span>
          </button>
        );
      })}
      <div className="hx-rail-hint mono">{mode === "universe" ? "Click a cluster to enter" : "Click a level to return · Esc"}</div>
    </nav>
  );
}
