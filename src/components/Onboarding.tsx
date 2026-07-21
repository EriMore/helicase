"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type CoachStep = { target: string | null; title: string; body: string; placement: "top" | "bottom" | "left" | "right" | "center" };

// Orbit/pan/zoom and protein selection have no small on-screen control to ring — they're
// gestures over the whole canvas — so those two steps are centered, un-ringed cards instead
// of pointing at an arbitrary sliver of the viewport.
const COACH_STEPS: CoachStep[] = [
  { target: null, title: "Navigate the Universe", body: "Drag to orbit, right-drag or shift-drag to pan, scroll to zoom toward the pointer, double-click to focus.", placement: "center" },
  { target: ".hx-label-territory", title: "Enter a cluster", body: "Click a cluster label to step inside that family of proteins — everything outside it steps aside.", placement: "bottom" },
  { target: null, title: "Select a protein", body: "Click any point to open its identity panel — name, organism, function, and evidence.", placement: "center" },
  { target: ".hx-rail", title: "Depth Rail", body: "Track where you are — Universe, Cluster, Protein, Structure — and jump back to any reachable level.", placement: "right" },
  { target: ".hx-query-wrap, .hx-query", title: "Query", body: "Search by name, accession, organism, family, function, or domain.", placement: "bottom" },
  { target: ".hx-ask-button", title: "Ask Atlas", body: "GPT-5.6 scene control — ask a question and watch it move the scene. Summon it anytime with ⌘K.", placement: "top" },
  { target: ".hx-guide-entry", title: "Replay this guide anytime", body: "GUIDE stays here in the header whenever you want a refresher.", placement: "bottom" },
];

type Rect = { top: number; left: number; width: number; height: number };

function measure(selector: string | null): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function OnboardingInvitation({ visible, onAccept, onDecline }: { visible: boolean; onAccept: () => void; onDecline: () => void }) {
  if (!visible) return null;
  return (
    <div className="hx-invite hx-glass" role="dialog" aria-label="New to the Atlas?">
      <div className="hx-invite-title serif">New to the Atlas?</div>
      <div className="hx-invite-actions">
        <button className="hx-btn-secondary mono" onClick={onDecline}>I&apos;LL EXPLORE</button>
        <button className="hx-btn-primary mono" onClick={onAccept}>SHOW ME AROUND</button>
      </div>
    </div>
  );
}

/** Mounted only while active (see AtlasExperience) so its step state always starts fresh. */
export function OnboardingGuide({ onFinish }: { onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = COACH_STEPS[stepIndex] ?? null;

  useEffect(() => {
    if (!step) return;
    const update = () => setRect(measure(step.target));
    update();
    window.addEventListener("resize", update);
    const interval = window.setInterval(update, 300);
    return () => { window.removeEventListener("resize", update); window.clearInterval(interval); };
  }, [step]);

  const isLast = stepIndex >= COACH_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  const next = useMemo(() => () => { if (isLast) onFinish(); else setStepIndex((current) => current + 1); }, [isLast, onFinish]);
  const back = useMemo(() => () => setStepIndex((current) => Math.max(0, current - 1)), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onFinish(); return; }
      if (event.key === "ArrowRight" || event.key === "Enter") { next(); return; }
      if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, back, onFinish]);

  if (!step) return null;

  const CARD_H = 180; const CARD_W = 300; const margin = 16;
  const clampTop = (value: number) => Math.min(Math.max(value, margin), Math.max(margin, window.innerHeight - CARD_H - margin));
  const clampLeft = (value: number) => Math.min(Math.max(value, margin), Math.max(margin, window.innerWidth - CARD_W - margin));
  const calloutStyle: CSSProperties = {};
  if (rect && step.placement !== "center") {
    if (step.placement === "bottom") { calloutStyle.top = clampTop(rect.top + rect.height + margin); calloutStyle.left = clampLeft(rect.left); }
    else if (step.placement === "top") { calloutStyle.top = clampTop(rect.top - margin - CARD_H); calloutStyle.left = clampLeft(rect.left); }
    else if (step.placement === "right") { calloutStyle.top = clampTop(rect.top); calloutStyle.left = clampLeft(rect.left + rect.width + margin); }
    else { calloutStyle.top = clampTop(rect.top); calloutStyle.left = clampLeft(rect.left - margin - CARD_W); }
  } else {
    calloutStyle.top = window.innerHeight / 2 - CARD_H / 2;
    calloutStyle.left = window.innerWidth / 2 - CARD_W / 2;
  }

  return (
    <>
      {rect && (
        <div
          className="hx-coach-ring"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
          aria-hidden
        />
      )}
      <div className="hx-coach hx-glass" style={calloutStyle} role="dialog" aria-label={step.title}>
        <div className="hx-coach-eyebrow mono">{stepIndex + 1} / {COACH_STEPS.length}</div>
        <div className="hx-coach-title serif">{step.title}</div>
        <p className="hx-coach-body">{step.body}</p>
        <div className="hx-coach-controls">
          <button className="hx-coach-skip mono" onClick={onFinish}>SKIP</button>
          <div className="hx-coach-nav">
            {!isFirst && <button className="hx-btn-secondary mono" onClick={back}>BACK</button>}
            <button className="hx-btn-primary mono" onClick={next}>{isLast ? "FINISH" : "NEXT"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
