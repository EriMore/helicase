"use client";

import { useEffect, useState } from "react";
import { proteinDetailSchema, type ProteinDetail } from "@/domain/schemas";

export type ProteinDetailState =
  | { accession: null; status: "unavailable"; data: null; error: null }
  | { accession: string; status: "loading"; data: null; error: null }
  | { accession: string; status: "available"; data: ProteinDetail; error: null }
  | { accession: string; status: "failed"; data: null; error: string };

export function useProteinDetail(accession: string | null): ProteinDetailState {
  const [state, setState] = useState<ProteinDetailState>({ accession: null, status: "unavailable", data: null, error: null });

  useEffect(() => {
    if (!accession) return;
    const controller = new AbortController();
    const load = async () => {
      setState({ accession, status: "loading", data: null, error: null });
      try {
        const response = await fetch(`/api/atlas/protein?accession=${encodeURIComponent(accession)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "No reviewed UniProt entry exists for this accession." : `Protein detail unavailable (${response.status})`);
        setState({ accession, status: "available", data: proteinDetailSchema.parse(await response.json()), error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ accession, status: "failed", data: null, error: error instanceof Error ? error.message : "Protein detail unavailable" });
      }
    };
    void load();
    return () => controller.abort();
  }, [accession]);

  if (!accession) return { accession: null, status: "unavailable", data: null, error: null };
  return state.accession === accession ? state : { accession, status: "loading", data: null, error: null };
}
