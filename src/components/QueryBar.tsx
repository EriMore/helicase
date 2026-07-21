"use client";

import { type FormEvent, useRef } from "react";

const SUGGESTIONS = [
  { label: "membrane receptors", query: "membrane receptors" },
  { label: "oxygen transport", query: "oxygen transport" },
  { label: "muscle proteins", query: "muscle proteins" },
  { label: "fluorescent proteins", query: "fluorescent proteins" },
  { label: "protein design example", query: "A5F934" },
];

type QueryBarProps = {
  visible: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClear: () => void;
  active: boolean;
  resultCount: number | null;
  filterLabel: string | null;
};

export function QueryBar({ visible, query, onQueryChange, onSubmit, onClear, active, resultCount, filterLabel }: QueryBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (!visible) return null;

  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(query); };

  return (
    <div className="hx-query-wrap">
      <form className="hx-query hx-glass" onSubmit={submit}>
        <div className="hx-query-row">
          <span className="hx-query-label mono">QUERY</span>
          <input
            ref={inputRef}
            className="hx-query-input serif"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") onClear(); }}
            placeholder="name · accession · organism · family · function · domain…"
            aria-label="Query the protein universe"
          />
          {active && <button type="button" className="hx-query-clear mono" onClick={onClear}>CLEAR ✕</button>}
          <button type="submit" className="hx-query-submit" aria-label="Run query">↑</button>
        </div>
        {active && (
          <div className="hx-query-results">
            {resultCount != null ? <>
              <span className="hx-query-count mono">{resultCount.toLocaleString()} MATCHED</span>
              <span className="hx-query-filter-label mono">FILTER</span>
              <span className="hx-query-filter-chip mono">{filterLabel}</span>
            </> : <span className="hx-query-zero mono">No indexed signals matched — try a broader term.</span>}
          </div>
        )}
      </form>
      {!active && (
        <div className="hx-suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <button key={suggestion.label} className="hx-suggestion-chip hx-glass mono" onClick={() => { onQueryChange(suggestion.query); onSubmit(suggestion.query); }}>{suggestion.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
