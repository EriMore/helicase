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
import { createRoot, type Root } from "react-dom/client";
import type { StructureReference } from "@/domain/atlas-data";

export type StructureRepresentation = "cartoon" | "surface" | "ball-and-stick" | "spacefill";
export type StructureColorMode = "chain" | "domain";
export type ResidueFocus = { start: number; end: number; chain?: string; requestId: number };
export type StructureDomain = { label: string; start: number; end: number; color: string };
export type MotionMode = "off" | "rotate" | "wiggle" | "uncertaintyWiggle";
type StructureStatus = "loading" | "ready" | "unavailable";
type StructureViewProps = {
  active: boolean; structure: StructureReference | null; confidenceActive?: boolean;
  representation?: StructureRepresentation; colorMode?: StructureColorMode; domains?: StructureDomain[];
  showLigands?: boolean; focusRange?: ResidueFocus | null; retryKey?: number; onStatusChange?: (status: StructureStatus) => void;
  onResiduePick?: (residueNumber: number, chain: string) => void;
  theme?: "light" | "dark";
  motion?: MotionMode;
  confidenceMean?: number | null;
  boundsLeft?: number | null;
  boundsRight?: number | null;
};

const AtlasViewportControls = () => null;
const TEAL = 0x0c8c78;

const REPRESENTATION_PARAMS: Record<Exclude<StructureRepresentation, "cartoon">, { type: "molecular-surface" | "ball-and-stick" | "spacefill"; typeParams: Record<string, unknown> }> = {
  surface: { type: "molecular-surface", typeParams: { alpha: 0.72, quality: "high" } },
  "ball-and-stick": { type: "ball-and-stick", typeParams: { alpha: 1, quality: "high" } },
  spacefill: { type: "spacefill", typeParams: { alpha: 1, quality: "high" } },
};

export function StructureView({ active, structure: structureReference, confidenceActive = false, representation = "cartoon", colorMode = "chain", domains = [], showLigands = true, focusRange = null, retryKey = 0, onStatusChange, onResiduePick, theme = "light", motion = "off", confidenceMean = null, boundsLeft = null, boundsRight = null }: StructureViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<Awaited<ReturnType<typeof createPluginUI>> | null>(null);
  const structureDataRef = useRef<Structure | null>(null);
  const onResiduePickRef = useRef(onResiduePick);
  const [status, setStatus] = useState<StructureStatus>("loading");

  useEffect(() => { onResiduePickRef.current = onResiduePick; }, [onResiduePick]);

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
              await plugin.builders.structure.representation.addRepresentation(component, representation === "cartoon"
                ? { type: "cartoon", color: "uniform", colorParams: { value: Color(parseInt(domain.color.replace("#", ""), 16)) }, typeParams: { alpha: 1, quality: "high" } }
                : { ...REPRESENTATION_PARAMS[representation], color: "uniform", colorParams: { value: Color(parseInt(domain.color.replace("#", ""), 16)) } });
            }
          }
        } else {
          const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, "polymer");
          const colorTheme = colorMode === "chain" ? "chain-id" : "uniform";
          if (polymer) await plugin.builders.structure.representation.addRepresentation(polymer, representation === "cartoon"
            ? { type: "cartoon", color: colorTheme, colorParams: colorTheme === "uniform" ? { value: Color(TEAL) } : undefined, typeParams: { alpha: 1, quality: "high" } }
            : { ...REPRESENTATION_PARAMS[representation], color: colorTheme, colorParams: colorTheme === "uniform" ? { value: Color(TEAL) } : undefined });
        }
        const ligand = showLigands ? await plugin.builders.structure.tryCreateComponentStatic(structure, "ligand") : null;
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
        if (!disposed) { setStatus("ready"); onStatusChange?.("ready"); }
      } catch {
        if (!disposed) { setStatus("unavailable"); onStatusChange?.("unavailable"); }
      }
    };

    void initialize();
    return () => { disposed = true; pluginRef.current = null; structureDataRef.current = null; disposeInstance(); };
  }, [active, confidenceActive, onStatusChange, representation, colorMode, domains, retryKey, showLigands, structureReference]);

  // Lighting/rotation/motion are visual-only and cheap to re-apply, so they live in
  // their own effect instead of the init effect above — toggling any of them must
  // never trigger a full Mol* plugin remount (redownloading and reparsing the structure).
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!active || !plugin) return;
    const dark = theme === "dark";
    // Real Mol* trackball animate modes only — "spin" (ROTATE, a continuous
    // camera-orbit) and "rock" (Procedural Motion's WIGGLE, a back-and-forth
    // oscillation), never a fabricated per-atom dynamics simulation. When tied
    // to confidence, amplitude/speed scale with the real mean AlphaFold pLDDT
    // already resolved for this structure — lower confidence rocks wider and
    // faster; nothing here is invented. See docs/SCIENTIFIC_DATA_BOUNDARIES.md.
    const animate =
      motion === "rotate" ? { name: "spin" as const, params: { speed: 0.35 } }
      : motion === "wiggle" ? { name: "rock" as const, params: { speed: 0.6, angle: 6 } }
      : motion === "uncertaintyWiggle" && confidenceMean != null ? { name: "rock" as const, params: { speed: 0.5 + ((100 - confidenceMean) / 100) * 0.9, angle: 4 + ((100 - confidenceMean) / 100) * 14 } }
      : { name: "off" as const, params: {} };
    plugin.canvas3d?.setProps({
      renderer: { exposure: dark ? 1.08 : 0.72, ambientIntensity: dark ? 0.7 : 0.46, interiorDarkening: dark ? 0.2 : 0.42 },
      trackball: { animate },
    });
  }, [active, theme, motion, confidenceMean, status]);

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

  // Re-center the model when the usable canvas bounds change (panel widths
  // differ between Inspect and Design, and the identity panel's width is
  // responsive) — Mol* only knows to re-frame when explicitly told to.
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!active || !plugin) return;
    plugin.canvas3d?.requestResize();
    plugin.canvas3d?.requestCameraReset({ durationMs: 0 });
  }, [active, boundsLeft, boundsRight, status]);

  if (!active || !structureReference) return null;
  return <div className="structure-view" style={{ left: boundsLeft ?? undefined, right: boundsRight ?? undefined }} aria-label={`Molecular view for ${structureReference.accession}`}>
    <div className="structure-canvas" ref={host} />
    <p className={`structure-status ${status}`}>{status === "ready" ? `${structureReference.source} ${structureReference.accession} · Mol*` : status === "loading" ? "Resolving cited coordinates…" : "Structure service unavailable · universe remains navigable"}</p>
  </div>;
}
