"use client";

import { type FormEvent, useEffect, useRef } from "react";

const SUGGESTIONS = ["why are these related?", "highlight low-confidence regions", "design a binder"];

type AskAtlasProps = {
  visible: boolean;
  navHint: string;
  hintVisible: boolean;
  commandOpen: boolean;
  onOpenCommand: () => void;
  onCloseCommand: () => void;
  command: string;
  onCommandChange: (value: string) => void;
  onSubmitCommand: (value: string) => void;
  busy: boolean;
  answer: { text: string; trace: string[] } | null;
  onDismissAnswer: () => void;
};

export function AskAtlas({ visible, navHint, hintVisible, commandOpen, onOpenCommand, onCloseCommand, command, onCommandChange, onSubmitCommand, busy, answer, onDismissAnswer }: AskAtlasProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandOpen) window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [commandOpen]);

  if (!visible) return null;

  const submit = (event: FormEvent) => { event.preventDefault(); if (command.trim()) onSubmitCommand(command); };

  return (
    <>
      {answer && (
        <div className="hx-ask-answer hx-glass">
          <div className="hx-ask-answer-head">
            <span className="hx-ask-answer-title mono"><span className="hx-status-dot" style={{ background: "var(--teal)" }} />ATLAS · GPT-5.6</span>
            <button className="hx-ask-dismiss mono" onClick={onDismissAnswer}>DISMISS ✕</button>
          </div>
          <p className="hx-ask-answer-body">{answer.text}</p>
          {answer.trace.length > 0 && (
            <div className="hx-ask-trace">
              {answer.trace.map((line, index) => <div key={index} className="hx-ask-trace-line mono">▸ {line}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="hx-ask-entry" style={{ display: commandOpen ? "none" : undefined }}>
        <div className="hx-ask-hint mono" style={{ opacity: hintVisible ? 1 : 0 }}>{navHint}</div>
        <button className="hx-ask-button hx-glass" onClick={onOpenCommand}>
          <span className="hx-status-dot" style={{ background: "var(--teal)" }} />
          <span className="hx-ask-button-label mono">{busy ? "ATLAS THINKING…" : "ASK ATLAS"}</span>
          <span className="hx-ask-button-key mono">⌘K</span>
        </button>
      </div>

      {commandOpen && (
        <div className="hx-command-scrim" onClick={onCloseCommand}>
          <div className="hx-command hx-glass" onClick={(event) => event.stopPropagation()}>
            <div className="hx-command-head">
              <span className="hx-command-title mono"><span className="hx-status-dot" style={{ background: "var(--teal)" }} />ATLAS · GPT-5.6</span>
              <span className="hx-command-sub mono">SEMANTIC · SCENE CONTROL</span>
            </div>
            <p className="hx-command-lede">Ask a question — I move the scene and show you what I changed. For exact filtering, use Query.</p>
            <form className="hx-command-input-row" onSubmit={submit}>
              <span className="hx-command-caret mono">›</span>
              <input
                ref={inputRef}
                className="hx-command-input serif"
                value={command}
                onChange={(event) => onCommandChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") onCloseCommand(); }}
                placeholder="why are these related? · highlight low-confidence regions · design a binder…"
              />
            </form>
            <div className="hx-command-suggest">
              {SUGGESTIONS.map((suggestion) => <button key={suggestion} className="hx-command-chip mono" onClick={() => onSubmitCommand(suggestion)}>{suggestion}</button>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
