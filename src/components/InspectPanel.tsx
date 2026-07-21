"use client";

import type { AtlasProtein } from "@/domain/atlas-data";
import type { StructureColorMode, StructureRepresentation } from "@/domain/atlas";
import type { ConfidenceLoadState } from "@/hooks/useStructureConfidence";
import type { StructureMetadataState } from "@/hooks/useStructureMetadata";

const REPRESENTATIONS: Array<{ id: StructureRepresentation; label: string }> = [
  { id: "cartoon", label: "CARTOON" }, { id: "surface", label: "SURFACE" },
  { id: "ball-and-stick", label: "BALL & STICK" }, { id: "spacefill", label: "SPACEFILL" },
];

type InspectPanelProps = {
  protein: AtlasProtein;
  representation: StructureRepresentation;
  onSetRepresentation: (representation: StructureRepresentation) => void;
  colorMode: StructureColorMode;
  onSetColorMode: (colorMode: StructureColorMode) => void;
  ligandsVisible: boolean;
  onToggleLigands: () => void;
  confidenceXray: boolean;
  onToggleConfidenceXray: () => void;
  confidence: ConfidenceLoadState;
  structureMetadata: StructureMetadataState;
  seqOpen: boolean;
  onOpenSequence: () => void;
  canDesign: boolean;
  onStartDesign: () => void;
};

export function InspectPanel({ protein, representation, onSetRepresentation, colorMode, onSetColorMode, ligandsVisible, onToggleLigands, confidenceXray, onToggleConfidenceXray, confidence, structureMetadata, seqOpen, onOpenSequence, canDesign, onStartDesign }: InspectPanelProps) {
  const predicted = protein.structure.kind === "predicted";
  const confLabel = predicted
    ? confidence.status === "available" ? `Confidence X-ray · mean pLDDT ${confidence.data.mean.toFixed(1)}` : confidence.status === "loading" ? "Resolving AlphaFold confidence…" : confidence.status === "failed" ? confidence.error : "Confidence unavailable"
    : "Confidence undefined · experimental structure";

  const experimentalNote = !predicted
    ? structureMetadata.status === "available" && structureMetadata.data.chains[0]?.referenceSequenceCoverage != null
      ? `RCSB/SIFTS maps ${(structureMetadata.data.chains[0].referenceSequenceCoverage * 100).toFixed(1)}% of UniProt ${structureMetadata.data.chains[0].uniprotAccession ?? protein.id}; chains ${structureMetadata.data.chains.map((chain) => chain.id).join(", ")}.`
      : structureMetadata.status === "loading" ? "Resolving RCSB/SIFTS residue coverage…" : "PDB residue coverage is unavailable; residue actions use author numbering."
    : null;

  return (
    <div className="hx-inspect hx-glass">
      <div className="hx-inspect-block hx-conf-block" style={{ borderColor: predicted ? "var(--glass-brd)" : "var(--line)" }}>
        <div className="hx-conf-head">
          <span className="hx-conf-icon" style={{ color: predicted ? "var(--evidence-predicted)" : "var(--ink-faint)" }}>◇</span>
          <span className="hx-conf-label">{confLabel}</span>
        </div>
        {predicted && (
          <button className={`hx-conf-btn mono ${confidenceXray ? "active" : ""}`} onClick={onToggleConfidenceXray} disabled={confidence.status !== "available"}>
            {confidenceXray ? "HIDE X-RAY" : "SHOW CONFIDENCE X-RAY"}
          </button>
        )}
        {predicted && confidenceXray && confidence.status === "available" && (
          <div className="hx-conf-legend">
            <div className="hx-conf-gradient" />
            <div className="hx-conf-scale mono"><span>LOW · 0</span><span>pLDDT</span><span>100 · HIGH</span></div>
          </div>
        )}
        {!predicted && experimentalNote && <p style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>{experimentalNote}</p>}
      </div>

      <div className="hx-inspect-block">
        <div className="hx-block-title mono">REPRESENTATION</div>
        <div className="hx-chip-row">
          {REPRESENTATIONS.map((option) => (
            <button key={option.id} className={`hx-chip mono ${representation === option.id ? "active" : ""}`} onClick={() => onSetRepresentation(option.id)}>{option.label}</button>
          ))}
        </div>
        <div className="hx-chip-row" style={{ marginTop: 8 }}>
          <button className={`hx-chip mono ${ligandsVisible ? "active" : ""}`} onClick={onToggleLigands}>LIGANDS {ligandsVisible ? "●" : "○"}</button>
          <button className="hx-chip mono" onClick={() => onSetColorMode(colorMode === "chain" ? "domain" : "chain")}>COLOR · {colorMode.toUpperCase()}</button>
        </div>
      </div>

      <div className="hx-inspect-block">
        <div className="hx-block-title mono">STRUCTURE</div>
        <div className="hx-struct-rows">
          <div className="hx-struct-row"><span className="hx-struct-k mono">SOURCE</span><span className="hx-struct-v mono">{protein.structure.source} {protein.structure.accession}</span></div>
          <div className="hx-struct-row"><span className="hx-struct-k mono">EVIDENCE</span><span className="hx-struct-v mono">{predicted ? "Predicted" : "Experimental"}</span></div>
        </div>
        <div className="hx-mol-note">Real Mol* renderer · {predicted ? "AlphaFold DB prediction" : "RCSB PDB deposited coordinates"}.</div>
      </div>

      <div className="hx-inspect-actions">
        <button className="hx-btn-secondary mono" onClick={onOpenSequence}>{seqOpen ? "HIDE SEQUENCE" : "SEQUENCE ↕"}</button>
        {canDesign && <button className="hx-btn-teal mono" onClick={onStartDesign}>DESIGN →</button>}
      </div>
    </div>
  );
}
