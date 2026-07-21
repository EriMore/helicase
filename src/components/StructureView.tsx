"use client";

import { useEffect, useRef, useState } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { PluginSpec } from "molstar/lib/mol-plugin/spec";
import { MAQualityAssessment, QualityAssessmentPLDDTPreset } from "molstar/lib/extensions/model-archive/quality-assessment/behavior";
import { Color } from "molstar/lib/mol-util/color";
import { StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { MolScriptBuilder as B } from "molstar/lib/mol-script/language/builder";
import { StructureElement, StructureProperties, type Structure } from "molstar/lib/mol-model/structure";
import type { StateObjectSelector } from "molstar/lib/mol-state";
import { createRoot, type Root } from "react-dom/client";
import type { StructureReference } from "@/domain/atlas-data";

export type StructureRepresentation = "cartoon" | "surface" | "ball-and-stick" | "spacefill";
export type StructureColorMode = "chain" | "domain";
export type ResidueFocus = { start: number; end: number; chain?: string; requestId: number };
export type StructureDomain = { label: string; start: number; end: number; color: string };
type StructureStatus = "loading" | "ready" | "unavailable";
type StructureViewProps = {
  active: boolean; structure: StructureReference | null; confidenceActive?: boolean;
  representation?: StructureRepresentation; colorMode?: StructureColorMode; domains?: StructureDomain[];
  showLigands?: boolean; focusRange?: ResidueFocus | null; retryKey?: number; onStatusChange?: (status: StructureStatus) => void;
  onResiduePick?: (residueNumber: number, chain: string) => void;
  theme?: "light" | "dark";
  autoRotate?: boolean;
};

const AtlasViewportControls = () => null;
const TEAL = 0x0c8c78;

const REPRESENTATION_PARAMS: Record<Exclude<StructureRepresentation, "cartoon">, { type: "molecular-surface" | "ball-and-stick" | "spacefill"; typeParams: Record<string, unknown> }> = {
  surface: { type: "molecular-surface", typeParams: { alpha: 0.72, quality: "high" } },
  "ball-and-stick": { type: "ball-and-stick", typeParams: { alpha: 1, quality: "high" } },
  spacefill: { type: "spacefill", typeParams: { alpha: 1, quality: "high" } },
};

export function StructureView({ active, structure: structureReference, confidenceActive = false, representation = "cartoon", colorMode = "chain", domains = [], showLigands = true, focusRange = null, retryKey = 0, onStatusChange, onResiduePick, theme = "light", autoRotate = false }: StructureViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<Awaited<ReturnType<typeof createPluginUI>> | null>(null);
  const structureDataRef = useRef<Structure | null>(null);
  const structureCellRef = useRef<StateObjectSelector | null>(null);
  const repRefsRef = useRef<StateObjectSelector[]>([]);
  const onResiduePickRef = useRef(onResiduePick);
  const [status, setStatus] = useState<StructureStatus>("loading");
  // Bumped once per successful download+parse; the representation effect below re-runs on
  // every bump *and* on every representation/colorMode/showLigands/confidenceActive change,
  // without ever re-triggering a redownload or reparse of the underlying structure.
  const [structureGeneration, setStructureGeneration] = useState(0);

  useEffect(() => { onResiduePickRef.current = onResiduePick; }, [onResiduePick]);

  // Download + parse only. Depends solely on which structure identity should be mounted —
  // never on representation/colorMode/showLigands/confidenceActive, so switching those
  // controls can never trigger a redownload, a reparse, or a full plugin remount.
  useEffect(() => {
    if (!active || !host.current || !structureReference) return;
    let disposed = false;
    let plugin: Awaited<ReturnType<typeof createPluginUI>> | undefined;
    let reactRoot: Root | undefined;
    let clickSubscription: { unsubscribe: () => void } | undefined;
    const target = document.createElement("div");
    target.className = "structure-molstar-root";
    host.current.appendChild(target);

    let cleanupQueued = false;
    const disposeInstance = () => {
      if (cleanupQueued) return;
      cleanupQueued = true;
      const pluginToDispose = plugin;
      const rootToUnmount = reactRoot;
      // Remove Mol*'s global custom-property registrations before a replacement
      // instance starts; defer only the nested React-root teardown.
      clickSubscription?.unsubscribe();
      pluginToDispose?.dispose();
      window.setTimeout(() => {
        rootToUnmount?.unmount();
        target.remove();
      }, 0);
    };

    const initialize = async () => {
      try {
        setStatus("loading");
        onStatusChange?.("loading");
        const spec = DefaultPluginUISpec();
        spec.behaviors = [...(spec.behaviors ?? []), PluginSpec.Behavior(MAQualityAssessment, { autoAttach: true, showTooltip: true })];
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
        pluginRef.current = plugin;
        repRefsRef.current = [];
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
        structureDataRef.current = structure.obj?.data ?? null;
        structureCellRef.current = structure;
        if (disposed) return;
        clickSubscription = plugin.behaviors.interaction.click.subscribe((event) => {
          const loci = event.current.loci;
          if (!StructureElement.Loci.is(loci)) return;
          const location = StructureElement.Loci.getFirstLocation(loci);
          if (!location) return;
          const residueNumber = StructureProperties.residue.auth_seq_id(location);
          const chain = StructureProperties.chain.auth_asym_id(location);
          onResiduePickRef.current?.(residueNumber, chain);
        });
        // Signals the representation effect to build the initial representation — it owns
        // requestResize/requestCameraReset and flips status to "ready" once that's done.
        if (!disposed) setStructureGeneration((current) => current + 1);
      } catch {
        if (!disposed) { setStatus("unavailable"); onStatusChange?.("unavailable"); }
      }
    };

    void initialize();
    return () => {
      disposed = true; pluginRef.current = null; structureDataRef.current = null; structureCellRef.current = null; repRefsRef.current = [];
      disposeInstance();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, structureReference, retryKey]);

  // Representation application only: reuses the already-downloaded, already-parsed structure
  // from the effect above. Deleting and re-adding just the representation/component state
  // objects is cheap relative to a full redownload+reparse, and never remounts the plugin.
  useEffect(() => {
    const plugin = pluginRef.current;
    const structure = structureCellRef.current;
    if (!active || !plugin || !structure || !structureReference || structureGeneration === 0) return;
    let cancelled = false;

    const apply = async () => {
      try {
        for (const ref of repRefsRef.current) {
          try { await plugin.build().delete(ref).commit(); } catch { /* already gone with the structure */ }
        }
        repRefsRef.current = [];
        if (cancelled) return;

        const experimental = structureReference.kind === "experimental";
        const created: StateObjectSelector[] = [];
        if (!experimental && confidenceActive) {
          await plugin.builders.structure.representation.applyPreset(structure, QualityAssessmentPLDDTPreset);
        } else if (colorMode === "domain" && domains.length > 0) {
          // Real UniProt-sourced domain ranges: one representation per range, uniformly colored.
          for (const domain of domains) {
            const expression = B.struct.generator.atomGroups({
              "residue-test": B.core.logic.and([B.core.rel.gre([B.ammp("auth_seq_id"), domain.start]), B.core.rel.lte([B.ammp("auth_seq_id"), domain.end])]),
            });
            const component = await plugin.builders.structure.tryCreateComponentFromExpression(structure, expression, `domain-${domain.start}-${domain.end}`, { tags: [`domain-${domain.start}-${domain.end}`] });
            if (component) {
              created.push(component);
              await plugin.builders.structure.representation.addRepresentation(component, representation === "cartoon"
                ? { type: "cartoon", color: "uniform", colorParams: { value: Color(parseInt(domain.color.replace("#", ""), 16)) }, typeParams: { alpha: 1, quality: "high" } }
                : { ...REPRESENTATION_PARAMS[representation], color: "uniform", colorParams: { value: Color(parseInt(domain.color.replace("#", ""), 16)) } });
            }
          }
        } else {
          const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, "polymer");
          const colorTheme = colorMode === "chain" ? "chain-id" : "uniform";
          if (polymer) {
            created.push(polymer);
            await plugin.builders.structure.representation.addRepresentation(polymer, representation === "cartoon"
              ? { type: "cartoon", color: colorTheme, colorParams: colorTheme === "uniform" ? { value: Color(TEAL) } : undefined, typeParams: { alpha: 1, quality: "high" } }
              : { ...REPRESENTATION_PARAMS[representation], color: colorTheme, colorParams: colorTheme === "uniform" ? { value: Color(TEAL) } : undefined });
          }
        }
        if (cancelled) return;
        const ligand = showLigands ? await plugin.builders.structure.tryCreateComponentStatic(structure, "ligand") : null;
        if (ligand) {
          created.push(ligand);
          await plugin.builders.structure.representation.addRepresentation(ligand, {
            type: "ball-and-stick",
            color: "element-symbol",
            typeParams: { alpha: 1, quality: "high" },
          });
        }
        repRefsRef.current = created;
        if (cancelled) return;
        plugin.canvas3d?.requestResize();
        plugin.canvas3d?.requestCameraReset({ durationMs: 0 });
        window.requestAnimationFrame(() => {
          if (cancelled) return;
          plugin.canvas3d?.requestResize();
          plugin.canvas3d?.requestCameraReset({ durationMs: 0 });
        });
        if (!cancelled) { setStatus("ready"); onStatusChange?.("ready"); }
      } catch {
        if (!cancelled) { setStatus("unavailable"); onStatusChange?.("unavailable"); }
      }
    };

    void apply();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, structureGeneration, representation, colorMode, domains, showLigands, confidenceActive, structureReference]);

  // Lighting/rotation are visual-only and cheap to re-apply, so they live in their
  // own effect instead of the init effect above — toggling either must never trigger
  // a full Mol* plugin remount (redownloading and reparsing the structure).
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!active || !plugin) return;
    const dark = theme === "dark";
    plugin.canvas3d?.setProps({
      renderer: { exposure: dark ? 1.08 : 0.72, ambientIntensity: dark ? 0.7 : 0.46, interiorDarkening: dark ? 0.2 : 0.42 },
      // A slow, honest camera-orbit spin — not a molecular-dynamics simulation. Atlas does not
      // fabricate conformational motion; see docs/SCIENTIFIC_DATA_BOUNDARIES.md.
      trackball: { animate: autoRotate ? { name: "spin", params: { speed: 0.35 } } : { name: "off", params: {} } },
    });
  }, [active, theme, autoRotate, status]);

  // Centre the molecular viewport in the real usable gap between the identity panel and
  // whatever right-side panel is mounted (Inspect or Design) — measured fresh from the DOM
  // (like WorldCanvas's protein-selection framing) rather than assumed from fixed CSS
  // widths, so it stays correct across viewport sizes, resizes, and panel changes. Mol*'s
  // own camera reset then centres the model within this corrected box.
  useEffect(() => {
    if (!active) return;
    const el = viewRef.current;
    if (!el) return;
    const update = () => {
      const identityEl = document.querySelector(".hx-identity");
      const rightPanelEl = document.querySelector(".hx-inspect, .hx-design");
      const leftPx = identityEl ? identityEl.getBoundingClientRect().right : 26;
      const rightPx = rightPanelEl ? window.innerWidth - rightPanelEl.getBoundingClientRect().left : 26;
      if (el.style.left !== `${leftPx}px` || el.style.right !== `${rightPx}px`) {
        el.style.left = `${leftPx}px`;
        el.style.right = `${rightPx}px`;
        const plugin = pluginRef.current;
        plugin?.canvas3d?.requestResize();
        plugin?.canvas3d?.requestCameraReset({ durationMs: 0 });
      }
    };
    update();
    window.addEventListener("resize", update);
    // Cheap poll to catch the identity/inspect panel mounting, changing tabs, or resizing
    // from something other than a window resize (e.g. a responsive width recalculation) —
    // two getBoundingClientRect() calls, only while a structure view is actually mounted.
    const interval = window.setInterval(update, 250);
    return () => { window.removeEventListener("resize", update); window.clearInterval(interval); };
  }, [active, status]);

  useEffect(() => {
    const plugin = pluginRef.current; const structure = structureDataRef.current;
    if (!active || !plugin || !structure || !focusRange) return;
    const residueTests = [B.core.rel.gre([B.ammp("auth_seq_id"), focusRange.start]), B.core.rel.lte([B.ammp("auth_seq_id"), focusRange.end])];
    const expression = B.struct.generator.atomGroups({
      "chain-test": focusRange.chain ? B.core.rel.eq([B.ammp("auth_asym_id"), focusRange.chain]) : undefined,
      "residue-test": B.core.logic.and(residueTests),
    });
    const query = StructureSelectionQuery(`Residues ${focusRange.start}-${focusRange.end}`, expression);
    plugin.managers.structure.selection.fromSelectionQuery("set", query);
    const loci = plugin.managers.structure.selection.getLoci(structure);
    plugin.managers.structure.focus.setFromLoci(loci);
    plugin.managers.camera.focusLoci(loci, { durationMs: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520, minRadius: 26, extraRadius: 14 });
  }, [active, focusRange]);

  if (!active || !structureReference) return null;
  return <div className="structure-view" ref={viewRef} aria-label={`Molecular view for ${structureReference.accession}`}>
    <div className="structure-canvas" ref={host} />
    <p className={`structure-status ${status}`}>{status === "ready" ? `${structureReference.source} ${structureReference.accession} · Mol*` : status === "loading" ? "Resolving cited coordinates…" : "Structure service unavailable · universe remains navigable"}</p>
  </div>;
}
