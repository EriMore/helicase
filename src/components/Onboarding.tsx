"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

type OnboardingStepDef = { title: string; body: string };

const STEPS: OnboardingStepDef[] = [
  { title: "Orbit", body: "Left-drag anywhere in the Universe to orbit around it." },
  { title: "Pan", body: "Right-drag, middle-drag, or shift-drag to pan — speed scales with how far out you are." },
  { title: "Zoom", body: "Scroll to zoom toward the pointer. Hold Ctrl (or pinch) for finer control." },
  { title: "Hover & select", body: "Hover a point to see its name. Click it to open the protein's identity panel." },
  { title: "Enter a cluster", body: "Click a cluster label to enter it — only that cluster's proteins stay in view." },
  { title: "Select a protein", body: "Inside a cluster, click any point to select a specific protein." },
  { title: "Depth navigation", body: "The Depth rail on the left always shows where you are. Click an earlier level, or press Esc, to return." },
  { title: "Query", body: "Type in the Query bar for exact, deterministic filtering by name, organism, family, or function." },
  { title: "Ask Atlas", body: "Press ⌘K, or click Ask Atlas, to ask GPT-5.6 a question — it reasons over the scene and can move it for you." },
];

type OnboardingProps = {
  open: boolean;
  step: number;
  onStep: (step: number) => void;
  onFinish: () => void;
  onSkip: () => void;
};

export function Onboarding({ open, step, onStep, onFinish, onSkip }: OnboardingProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, step]);

  if (!open) return null;

  const clampedStep = Math.min(step, STEPS.length - 1);
  const current = STEPS[clampedStep];
  const isLast = clampedStep >= STEPS.length - 1;
  const advance = () => (isLast ? onFinish() : onStep(clampedStep + 1));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { onSkip(); return; }
    if (event.key === "ArrowRight" || event.key === "Enter") { event.preventDefault(); advance(); return; }
    if (event.key === "ArrowLeft" && clampedStep > 0) { event.preventDefault(); onStep(clampedStep - 1); }
  };

  return (
    <div className="hx-onboard-scrim" onClick={onSkip}>
      <div
        ref={panelRef}
        className="hx-onboard hx-glass"
        role="dialog"
        aria-modal="true"
        aria-label={`Atlas walkthrough, step ${clampedStep + 1} of ${STEPS.length}: ${current.title}`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="hx-onboard-head">
          <span className="hx-onboard-eyebrow mono">WALKTHROUGH · {clampedStep + 1} / {STEPS.length}</span>
          <button className="hx-onboard-skip mono" onClick={onSkip}>SKIP TUTORIAL ✕</button>
        </div>
        <h2 className="hx-onboard-title serif">{current.title}</h2>
        <p className="hx-onboard-body">{current.body}</p>
        <div className="hx-onboard-dots" role="presentation">
          {STEPS.map((stepDef, index) => (
            <span key={stepDef.title} className={`hx-onboard-dot ${index === clampedStep ? "active" : ""}`} />
          ))}
        </div>
        <div className="hx-onboard-controls">
          <button className="hx-btn-secondary mono" disabled={clampedStep === 0} onClick={() => onStep(clampedStep - 1)}>← BACK</button>
          <button className="hx-btn-teal mono" onClick={advance}>{isLast ? "FINISH" : "NEXT →"}</button>
        </div>
      </div>
    </div>
  );
}
