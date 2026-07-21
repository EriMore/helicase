"use client";

import type { SceneMode } from "@/domain/atlas";

type Level = { key: "universe" | "territory" | "protein" | "structure"; label: string };
const LEVELS: Level[] = [
  { key: "universe", label: "UNIVERSE" },
  { key: "territory", label: "CLUSTER" },
  { key: "protein", label: "PROTEIN" },
  { key: "structure", label: "STRUCTURE" },
];

type DepthRailProps = {
  mode: SceneMode;
  visible: boolean;
  territoryLabel: string | null;
  proteinName: string | null;
  structureLabel: string | null;
  onNavigate: (level: "universe" | "territory" | "protein" | "structure") => void;
};

function currentDepth(mode: SceneMode): number {
  if (mode === "inspect" || mode === "design") return 3;
  if (mode === "glance") return 2;
  if (mode === "territory") return 1;
  return 0;
}

export function DepthRail({ mode, visible, territoryLabel, proteinName, structureLabel, onNavigate }: DepthRailProps) {
  const depth = currentDepth(mode);
  return (
    <nav aria-label="Spatial depth" className="hx-rail hx-glass" style={{ opacity: visible ? 1 : 0 }}>
      <div className="hx-rail-title mono">DEPTH</div>
      {LEVELS.map((level, index) => {
        const active = index === depth;
        const reachable = index < depth;
        const sub = level.key === "territory" ? territoryLabel : level.key === "protein" ? proteinName : level.key === "structure" ? structureLabel : null;
        const clickable = reachable || active;
        return (
          <button
            key={level.key}
            className="hx-rail-level"
            style={{ cursor: clickable ? "pointer" : "default" }}
            disabled={!clickable}
            onClick={() => { if (clickable) onNavigate(level.key); }}
          >
            <span className="hx-rail-dotwrap">
              <span className="hx-rail-dot" style={{ background: active ? "var(--teal)" : reachable ? "var(--ink-soft)" : "transparent", borderColor: active ? "var(--teal)" : "var(--glass-brd)" }} />
            </span>
            <span className="hx-rail-textwrap">
              <span className="hx-rail-label mono" style={{ color: active ? "var(--ink)" : reachable ? "var(--ink-soft)" : "var(--ink-faint)" }}>{level.label}</span>
              {sub && <span className="hx-rail-sub">{sub}</span>}
            </span>
          </button>
        );
      })}
      <div className="hx-rail-hint mono">{mode === "universe" ? "Click a cluster to enter" : "Click a level to return · Esc"}</div>
    </nav>
  );
}
