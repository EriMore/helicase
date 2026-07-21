"use client";

import { useMemo } from "react";
import type { AtlasProtein } from "@/domain/atlas-data";
import type { IdentityTab } from "@/domain/atlas";
import type { ProteinDetailState } from "@/hooks/useProteinDetail";
import { computeRelationshipThreads } from "@/domain/relationships";

const THREAD_LIMIT = 5;

type IdentityPanelProps = {
  protein: AtlasProtein;
  detail: ProteinDetailState;
  tab: IdentityTab;
  onSetTab: (tab: IdentityTab) => void;
  threadsOn: boolean;
  onToggleThreads: () => void;
  relatedPool: AtlasProtein[];
  onSelectRelated: (protein: AtlasProtein) => void;
  showInspectButton: boolean;
  onInspect: () => void;
  onOpenSequence: () => void;
  canDesign: boolean;
  onStartDesign: () => void;
  onClose: () => void;
};

export function IdentityPanel({ protein, detail, tab, onSetTab, threadsOn, onToggleThreads, relatedPool, onSelectRelated, showInspectButton, onInspect, onOpenSequence, canDesign, onStartDesign, onClose }: IdentityPanelProps) {
  const predicted = protein.structure.kind === "predicted";
  const threads = useMemo(() => (threadsOn ? computeRelationshipThreads(protein, relatedPool, THREAD_LIMIT) : []), [threadsOn, protein, relatedPool]);
  const detailReady = detail.status === "available";

  return (
    <div className="hx-identity hx-glass">
      <div className="hx-identity-fixed">
        <div className="hx-identity-head">
          <span className="hx-identity-id mono">{protein.id}</span>
          <div className="hx-identity-head-right">
            <span className="hx-identity-gene mono">{detailReady && detail.data.gene ? detail.data.gene : ""}</span>
            <button className="hx-identity-close mono" onClick={onClose} aria-label="Close and return one level">✕</button>
          </div>
        </div>
        <h1 className="hx-identity-name serif">{protein.name}</h1>
        <div className="hx-identity-organism">{protein.organism}</div>
        <div className="hx-evidence-chip" style={{ borderColor: predicted ? "var(--evidence-predicted)" : "var(--teal)" }}>
          <span className={`hx-evidence-dot ${predicted ? "predicted" : "experimental"}`} style={{ background: predicted ? "var(--evidence-predicted)" : "var(--teal)" }} />
          <span className="hx-evidence-label mono">{predicted ? "Predicted structure" : "Experimental structure"}</span>
        </div>

        <div className="hx-tabs">
          <button className={`hx-tab mono ${tab === "glance" ? "active" : ""}`} onClick={() => onSetTab("glance")}>GLANCE</button>
          <button className={`hx-tab mono ${tab === "learn" ? "active" : ""}`} onClick={() => onSetTab("learn")}>LEARN</button>
        </div>
      </div>

      <div className="hx-identity-body">
        {tab === "glance" && (
          <div className="hx-panel-fade">
            <div className="hx-rows">
              <Row k="ORGANISM" v={protein.organism} />
              <Row k="GENE" v={detailReady ? detail.data.gene ?? "Not annotated" : "…"} unknown={detailReady && !detail.data.gene} />
              <Row k="FAMILY" v={protein.family} />
              <Row k="LENGTH" v={`${protein.length.toLocaleString()} aa`} />
            </div>
            <p className="hx-func-summary">
              {detail.status === "loading" && "Resolving function summary from UniProt…"}
              {detail.status === "failed" && "Function summary unavailable — UniProt could not be reached."}
              {detailReady && (detail.data.functionSummary ?? "No function annotation is recorded in UniProt for this entry.")}
            </p>
            <div className="hx-source-line mono">
              UniProt {protein.id} · {protein.structure.source} {protein.structure.accession}
            </div>
          </div>
        )}

        {tab === "learn" && (
          <div className="hx-panel-fade">
            <p className="hx-learn-body">
              {detail.status === "loading" && "Resolving UniProt record…"}
              {detail.status === "failed" && "UniProt detail unavailable right now — Glance data remains accurate."}
              {detailReady && (detail.data.functionFull ?? detail.data.functionSummary ?? "No function annotation is recorded in UniProt for this entry.")}
            </p>
            <div className="hx-learn-rows">
              <LearnRow k="CELLULAR LOCATION" v={detailReady ? detail.data.subcellularLocation : null} />
              <LearnRow k="PATHWAY" v={detailReady ? detail.data.pathway : null} />
              <LearnRow k="DISEASE RELEVANCE" v={detailReady ? detail.data.disease : null} />
              <LearnRow k="KEYWORDS" v={detailReady && detail.data.keywords.length ? detail.data.keywords.join(", ") : null} />
            </div>
            <div className="hx-section-label mono">DOMAINS</div>
            {detailReady && detail.data.domains.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {detail.data.domains.map((domain, index) => (
                  <div key={`${domain.label}-${domain.start}`} className="hx-domain-row">
                    <span className="hx-domain-swatch" style={{ background: domainColor(index) }} />
                    <span className="hx-domain-label">{domain.label}</span>
                    <span className="hx-domain-range mono">{domain.start}–{domain.end}</span>
                  </div>
                ))}
              </div>
            ) : <div className="hx-row-v unknown">Not annotated in UniProt</div>}
            <div className="hx-section-label mono">REFERENCES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detailReady ? detail.data.references.map((reference) => (
                <a key={reference.url} className="hx-ref" href={reference.url} target="_blank" rel="noreferrer">{reference.label}</a>
              )) : <div className="hx-row-v unknown">—</div>}
            </div>
          </div>
        )}

        <div className="hx-threads-block">
          <div className="hx-threads-head">
            <span className="hx-threads-title mono">RELATIONSHIP THREADS</span>
            <button className={`hx-threads-toggle mono ${threadsOn ? "on" : ""}`} onClick={onToggleThreads}>{threadsOn ? "HIDE" : "REVEAL"}</button>
          </div>
          {threadsOn && (
            <div className="hx-thread-list">
              {threads.length === 0 && <div className="hx-thread-empty">No annotated or computed relationship signal is available yet for this protein in the loaded profile.</div>}
              {threads.map((thread) => (
                <button key={thread.protein.id} className="hx-thread" onClick={() => onSelectRelated(thread.protein)}>
                  <div className="hx-thread-row">
                    <span className="hx-thread-swatch" />
                    <span className="hx-thread-name">{thread.protein.name}</span>
                    <span className="hx-thread-acc mono">{thread.protein.id}</span>
                  </div>
                  <div className="hx-thread-meta">
                    <span className="hx-thread-type mono">{thread.type.toUpperCase()}</span>
                    <span className="hx-thread-status mono">{thread.status.toUpperCase()}</span>
                  </div>
                  <div className="hx-thread-basis">{thread.basis}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hx-actions">
          {showInspectButton && <button className="hx-btn-primary mono" onClick={onInspect}>INSPECT STRUCTURE →</button>}
          <button className="hx-btn-secondary mono" onClick={onOpenSequence}>SEQUENCE</button>
          {canDesign && <button className="hx-btn-teal mono" onClick={onStartDesign}>DESIGN FROM THIS →</button>}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, unknown }: { k: string; v: string; unknown?: boolean }) {
  return (
    <div className="hx-row">
      <span className="hx-row-k mono">{k}</span>
      <span className={`hx-row-v ${unknown ? "unknown" : ""}`}>{v}</span>
    </div>
  );
}

function LearnRow({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <div className="hx-learn-k mono">{k}</div>
      <div className={`hx-learn-v ${v ? "" : "unknown"}`}>{v ?? "Not annotated in UniProt"}</div>
    </div>
  );
}

const DOMAIN_PALETTE = ["var(--fam-0)", "var(--fam-1)", "var(--fam-2)", "var(--fam-3)", "var(--fam-4)", "var(--fam-5)"];
function domainColor(index: number) { return DOMAIN_PALETTE[index % DOMAIN_PALETTE.length]; }
