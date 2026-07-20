"use client";

import { useEffect, useState } from "react";
import type { StructureReference } from "@/domain/atlas-data";
import { confidenceDatasetSchema, type ConfidenceDataset } from "@/domain/schemas";

export type ConfidenceLoadState =
  | { accession: string | null; status: "unavailable"; data: null; error: string | null }
  | { accession: string; status: "loading"; data: null; error: null }
  | { accession: string; status: "available"; data: ConfidenceDataset; error: null }
  | { accession: string; status: "failed"; data: null; error: string };

export function useStructureConfidence(reference: StructureReference | null): ConfidenceLoadState {
  const accession = reference?.kind === "predicted" ? reference.accession : null;
  const [state, setState] = useState<ConfidenceLoadState>({ accession: null, status: "unavailable", data: null, error: null });
  useEffect(() => {
    if (!accession) return;
    const controller = new AbortController();
    const load = async () => {
      setState({ accession, status: "loading", data: null, error: null });
      try {
        const response = await fetch(`/api/structure/confidence?accession=${encodeURIComponent(accession)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "No verified AlphaFold confidence is available." : `Confidence service unavailable (${response.status})`);
        setState({ accession, status: "available", data: confidenceDatasetSchema.parse(await response.json()), error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ accession, status: "failed", data: null, error: error instanceof Error ? error.message : "Confidence unavailable" });
      }
    };
    void load();
    return () => controller.abort();
  }, [accession]);
  if (!accession) return { accession: null, status: "unavailable", data: null, error: null };
  return state.accession === accession ? state : { accession, status: "loading", data: null, error: null };
}
