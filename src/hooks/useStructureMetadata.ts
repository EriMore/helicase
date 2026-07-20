"use client";

import { useEffect, useState } from "react";
import type { StructureReference } from "@/domain/atlas-data";
import { structureMetadataSchema, type StructureMetadata } from "@/domain/schemas";

export type StructureMetadataState =
  | { status: "unavailable" | "loading"; data: null; error: null }
  | { status: "available"; data: StructureMetadata; error: null }
  | { status: "failed"; data: null; error: string | null };

export function useStructureMetadata(reference: StructureReference | null): StructureMetadataState {
  const accession = reference?.kind === "experimental" ? reference.accession : null;
  const [loaded, setLoaded] = useState<{ accession: string; data: StructureMetadata | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!accession) return;
    const controller = new AbortController();
    void fetch(`/api/structure/metadata?accession=${encodeURIComponent(accession)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`Structure metadata unavailable (${response.status})`); return response.json(); })
      .then((payload) => setLoaded({ accession, data: structureMetadataSchema.parse(payload), error: null }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setLoaded({ accession, data: null, error: error instanceof Error ? error.message : "Structure metadata unavailable" }); });
    return () => controller.abort();
  }, [accession]);
  if (!accession) return { status: "unavailable", data: null, error: null };
  if (loaded?.accession !== accession) return { status: "loading", data: null, error: null };
  return loaded.data ? { status: "available", data: loaded.data, error: null } : { status: "failed", data: null, error: loaded.error };
}
