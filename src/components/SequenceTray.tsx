"use client";

import { useMemo, useRef, useState } from "react";
import type { AtlasProtein } from "@/domain/atlas-data";
import type { SequenceSelection } from "@/domain/atlas";
import type { ProteinDetailState } from "@/hooks/useProteinDetail";

const DOMAIN_PALETTE = ["var(--fam-0)", "var(--fam-1)", "var(--fam-2)", "var(--fam-3)", "var(--fam-4)", "var(--fam-5)"];
const VIRTUALIZE_THRESHOLD = 4_000;
const RESIDUES_PER_ROW = 60;

type SequenceTrayProps = {
  protein: AtlasProtein;
  detail: ProteinDetailState;
  selection: SequenceSelection | null;
  onSetSelection: (selection: SequenceSelection | null) => void;
  onClose: () => void;
};

export function SequenceTray({ protein, detail, selection, onSetSelection, onClose }: SequenceTrayProps) {
  const dragAnchor = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const sequence = detail.status === "available" ? detail.data.sequence : null;
  const domains = detail.status === "available" ? detail.data.domains : [];
  const length = sequence?.length ?? protein.length;
  const virtualized = length > VIRTUALIZE_THRESHOLD;

  const domainColorAt = (residueIndex: number): string => {
    const oneBased = residueIndex + 1;
    const domainIndex = domains.findIndex((domain) => oneBased >= domain.start && oneBased <= domain.end);
    return domainIndex >= 0 ? DOMAIN_PALETTE[domainIndex % DOMAIN_PALETTE.length] : "var(--ink)";
  };

  const rows = useMemo(() => {
    if (!sequence || virtualized) return [];
    const built: Array<{ start: number; residues: string }> = [];
    for (let start = 0; start < sequence.length; start += RESIDUES_PER_ROW) built.push({ start, residues: sequence.slice(start, start + RESIDUES_PER_ROW) });
    return built;
  }, [sequence, virtualized]);

  const beginDrag = (index: number) => { dragAnchor.current = index; setDragging(true); onSetSelection({ start: index, end: index }); };
  const continueDrag = (index: number) => {
    if (!dragging || dragAnchor.current == null) return;
    onSetSelection({ start: Math.min(dragAnchor.current, index), end: Math.max(dragAnchor.current, index) });
  };
  const endDrag = () => setDragging(false);

  const seqTag = length > VIRTUALIZE_THRESHOLD ? "VIRTUALIZED" : detail.status === "available" && detail.data.sequence ? `UNIPROT ${protein.id}` : "UNVERIFIED";
  const readout = selection ? `Residues ${selection.start + 1}${selection.end > selection.start ? `–${selection.end + 1}` : ""} → highlighted in structure` : "Drag across residues to select · click the 3D structure to reverse-select";

  return (
    <div className="hx-sequence hx-glass">
      <div className="hx-sequence-head">
        <div className="hx-sequence-head-left">
          <span className="hx-sequence-label mono">SEQUENCE</span>
          <span className="hx-sequence-name serif">{protein.name}</span>
          <span className="hx-sequence-meta mono">{length.toLocaleString()} aa</span>
          <span className="hx-sequence-tag mono" style={{ color: seqTag === "VIRTUALIZED" || seqTag === "UNVERIFIED" ? "var(--evidence-predicted)" : "var(--teal)", borderColor: seqTag === "VIRTUALIZED" || seqTag === "UNVERIFIED" ? "var(--evidence-predicted)" : "var(--teal)" }}>{seqTag}</span>
        </div>
        <button className="hx-sequence-close mono" onClick={onClose}>CLOSE ✕</button>
      </div>

      <div className="hx-sequence-body" onMouseUp={endDrag} onMouseLeave={endDrag}>
        {detail.status === "loading" && <p className="hx-sequence-note">Resolving canonical sequence from UniProt…</p>}
        {detail.status === "failed" && <p className="hx-sequence-note">Sequence unavailable — UniProt could not be reached.</p>}
        {detail.status === "available" && !sequence && <p className="hx-sequence-note">No canonical sequence is recorded in UniProt for this entry.</p>}
        {detail.status === "available" && sequence && virtualized && (
          <div>
            <p className="hx-sequence-note">{length.toLocaleString()} residues — rendering the full chain as one line would be unreadable. Domain overview shown below; open UniProt for the residue-level sequence.</p>
            {domains.length > 0 ? (
              <div className="hx-sequence-domain-track">
                {domains.map((domain, index) => (
                  <div key={`${domain.label}-${domain.start}`} className="hx-sequence-domain-seg" title={`${domain.label} ${domain.start}-${domain.end}`} style={{ background: DOMAIN_PALETTE[index % DOMAIN_PALETTE.length], flexGrow: Math.max(1, domain.end - domain.start) }} />
                ))}
              </div>
            ) : <p className="hx-sequence-note">No domain annotations recorded for a virtualized overview.</p>}
            <div className="hx-sequence-minimap mono"><span>1</span><span>{Math.round(length / 2).toLocaleString()}</span><span>{length.toLocaleString()}</span></div>
          </div>
        )}
        {detail.status === "available" && sequence && !virtualized && (
          <div>
            {rows.map((row) => (
              <div key={row.start} className="hx-sequence-row">
                <span className="hx-sequence-num mono">{row.start + 1}</span>
                <span>
                  {row.residues.split("").map((residue, offset) => {
                    const index = row.start + offset;
                    const isSelected = !!selection && index >= selection.start && index <= selection.end;
                    return (
                      <span
                        key={index}
                        className={`hx-residue ${isSelected ? "sel" : ""}`}
                        style={{ color: isSelected ? "#fff" : domainColorAt(index) }}
                        onMouseDown={() => beginDrag(index)}
                        onMouseEnter={() => continueDrag(index)}
                      >{residue}</span>
                    );
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hx-sequence-foot">
        <div className="hx-sequence-legend">
          {domains.length > 0 ? domains.slice(0, 4).map((domain, index) => (
            <span key={`${domain.label}-${domain.start}`} className="hx-sequence-legend-item"><span className="hx-sequence-legend-swatch" style={{ background: DOMAIN_PALETTE[index % DOMAIN_PALETTE.length] }} />{domain.label}</span>
          )) : <span className="hx-sequence-legend-item">No UniProt domain features recorded for this entry</span>}
        </div>
        <div className="hx-sequence-readout mono">{readout}</div>
      </div>
    </div>
  );
}
