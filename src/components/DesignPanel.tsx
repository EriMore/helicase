"use client";

import type { DesignState } from "@/domain/atlas";
import type { DesignTrajectory } from "@/domain/schemas";

export type DesignBeat = {
  id: string;
  label: string;
  range: [number, number];
  kind: "real" | "evidence-gate";
};

/**
 * The continuous spatial trajectory the design journey plays through. Beats
 * mapped to "real" render the corresponding attributable trajectory stage;
 * beats mapped to "evidence-gate" have no backbone-diffusion or predicted-fold
 * artifact behind the official ProteinMPNN 6EHB example and say so plainly
 * instead of inventing frames. See docs/design/final/SCIENTIFIC_DATA_BOUNDARIES.md.
 */
export const DESIGN_BEATS: DesignBeat[] = [
  { id: "target", label: "TARGET & SITE", range: [0, 0.15], kind: "real" },
  { id: "backbone", label: "BACKBONE CANDIDATES", range: [0.15, 0.3], kind: "evidence-gate" },
  { id: "sequence", label: "SEQUENCE DESIGN CANDIDATES", range: [0.3, 0.55], kind: "real" },
  { id: "fold", label: "PREDICTED FOLD & METRICS", range: [0.55, 0.7], kind: "evidence-gate" },
  { id: "compare", label: "COMPARE CANDIDATES", range: [0.7, 0.9], kind: "real" },
  { id: "resolve", label: "RESOLVE", range: [0.9, 1.0001], kind: "real" },
];

export function beatAtProgress(progress: number): DesignBeat {
  return DESIGN_BEATS.find((beat) => progress >= beat.range[0] && progress < beat.range[1]) ?? DESIGN_BEATS[DESIGN_BEATS.length - 1];
}

type DesignPanelProps = {
  proteinName: string;
  trajectory: DesignTrajectory;
  design: DesignState;
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
  onSelectCandidate: (candidateId: string) => void;
  onExit: () => void;
};

export function DesignPanel({ proteinName, trajectory, design, onPlayPause, onSeek, onSelectCandidate, onExit }: DesignPanelProps) {
  const beat = beatAtProgress(design.progress);
  const sourceStage = trajectory.stages.find((stage) => stage.id === "source-complex") ?? trajectory.stages[0];
  const sequenceStage = trajectory.stages.find((stage) => stage.id === "sequence-generation");
  const validationStage = trajectory.stages.find((stage) => stage.id === "validation-boundary");
  const candidates = sequenceStage?.candidates ?? [];
  const selectedCandidate = candidates.find((candidate) => candidate.id === design.selectedCandidateId) ?? candidates[0] ?? null;

  return (
    <div className="hx-design hx-glass">
      <div className="hx-design-head">
        <span className="hx-design-eyebrow mono">DESIGN TRAJECTORY</span>
        <button className="hx-design-exit mono" onClick={onExit}>EXIT ✕</button>
      </div>
      <div className="hx-design-from">From {proteinName}</div>

      <div className="hx-design-transport">
        <button className="hx-design-play" onClick={onPlayPause} aria-label={design.playback === "playing" ? "Pause" : "Play"}>{design.playback === "playing" ? "❚❚" : "▸"}</button>
        <input
          type="range" className="hx-design-scrubber" min={0} max={1000} value={Math.round(design.progress * 1000)}
          onChange={(event) => onSeek(Number(event.target.value) / 1000)}
          aria-label="Scrub the design trajectory"
        />
      </div>

      <div className="hx-design-timeline">
        {DESIGN_BEATS.map((candidateBeat) => {
          const active = candidateBeat.id === beat.id;
          const done = design.progress >= candidateBeat.range[1];
          return (
            <button key={candidateBeat.id} className="hx-design-stage" onClick={() => onSeek(candidateBeat.range[0] + 0.001)}>
              <span className="hx-design-stage-dot" style={{ background: done ? "var(--teal)" : active ? "var(--teal)" : "transparent", borderColor: done || active ? "var(--teal)" : "var(--glass-brd)" }} />
              <span className="hx-design-stage-label mono" style={{ color: active ? "var(--ink)" : done ? "var(--ink-soft)" : "var(--ink-faint)" }}>{candidateBeat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="hx-design-body-wrap">
        {beat.id === "target" && sourceStage && <>
          <div className="hx-design-stage-tag mono">TARGET · {sourceStage.method}</div>
          <p className="hx-design-stage-body">{sourceStage.description}</p>
        </>}

        {beat.id === "backbone" && <>
          <div className="hx-design-stage-tag mono">BACKBONE CANDIDATES</div>
          <div className="hx-design-evidence-gate">No RFdiffusion-class backbone-generation artifact accompanies this example. Atlas does not fabricate intermediate backbone frames — this beat is an honest evidence gate, not a computed result.</div>
        </>}

        {beat.id === "sequence" && sequenceStage && <>
          <div className="hx-design-stage-tag mono">SEQUENCE DESIGN · {sequenceStage.method}</div>
          <p className="hx-design-stage-body">{sequenceStage.description}</p>
          <div className="hx-design-metrics">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="hx-design-metric">
                <span className="hx-design-metric-k mono">{candidate.name}</span>
                <span className="hx-design-metric-v mono" style={{ color: "var(--ink)" }}>score {candidate.metrics[0]?.value.toFixed(4)} · recovery {((candidate.metrics[2]?.value ?? 0) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>}

        {beat.id === "fold" && <>
          <div className="hx-design-stage-tag mono">PREDICTED FOLD & METRICS</div>
          <div className="hx-design-evidence-gate">No structure-prediction artifact (AlphaFold2/Boltz-class) exists for these designed sequences in the official example. Only the real ProteinMPNN compatibility score above is available — Atlas will not invent a fold, pLDDT, pTM, or ipTM value.</div>
        </>}

        {beat.id === "compare" && <>
          <div className="hx-design-stage-tag mono">COMPARE CANDIDATES</div>
          <p className="hx-design-stage-body">Two real ProteinMPNN candidates from the official example. Pick one to carry forward as the resolved design.</p>
          <div className="hx-design-compare">
            {candidates.map((candidate) => (
              <button key={candidate.id} className={`hx-design-candidate ${selectedCandidate?.id === candidate.id ? "active" : ""}`} onClick={() => onSelectCandidate(candidate.id)}>
                <div className="hx-design-candidate-name mono" style={{ color: selectedCandidate?.id === candidate.id ? "var(--teal)" : "var(--ink-soft)" }}>{candidate.name.toUpperCase()}</div>
                <div className="hx-design-candidate-metrics mono">score {candidate.metrics[0]?.value.toFixed(4)}<br />recovery {((candidate.metrics[2]?.value ?? 0) * 100).toFixed(1)}%</div>
              </button>
            ))}
          </div>
        </>}

        {beat.id === "resolve" && validationStage && <>
          <div className="hx-design-stage-tag mono">RESOLVED · {validationStage.method}</div>
          <p className="hx-design-stage-body">{validationStage.description}</p>
          {selectedCandidate && <div className="hx-design-metrics">
            <div className="hx-design-metric"><span className="hx-design-metric-k mono">SELECTED</span><span className="hx-design-metric-v mono" style={{ color: "var(--teal)" }}>{selectedCandidate.name}</span></div>
            <div className="hx-design-metric"><span className="hx-design-metric-k mono">SCORE</span><span className="hx-design-metric-v mono">{selectedCandidate.metrics[0]?.value.toFixed(4)}</span></div>
            <div className="hx-design-metric"><span className="hx-design-metric-k mono">STATUS</span><span className="hx-design-metric-v mono" style={{ color: "var(--ink-soft)" }}>precomputed</span></div>
          </div>}
        </>}
      </div>

      <div className="hx-design-provenance">Precomputed trajectory · not live computation. Real official ProteinMPNN output for UniProt A5F934 / PDB 6EHB. No experimental validation exists for this journey.</div>
      <div className="hx-design-controls">
        <button className="hx-btn-secondary mono" onClick={() => onSeek(Math.max(0, beat.range[0] - 0.16))}>← BACK</button>
        <button className="hx-btn-primary-teal mono" onClick={design.progress >= 1 ? onExit : onPlayPause}>{design.progress >= 1 ? "FINISH" : design.playback === "playing" ? "PAUSE" : "PLAY"}</button>
      </div>
    </div>
  );
}
