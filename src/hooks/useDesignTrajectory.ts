"use client";

import { useEffect, useState } from "react";
import { designTrajectorySchema, type DesignTrajectory } from "@/domain/schemas";

export type DesignTrajectoryLoadState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "available"; data: DesignTrajectory; error: null }
  | { status: "failed"; data: null; error: string };

export function useDesignTrajectory(active: boolean): DesignTrajectoryLoadState {
  const [state, setState] = useState<DesignTrajectoryLoadState>({ status: "idle", data: null, error: null });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void fetch("/data/design/proteinmpnn-6ehb.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Design artifact unavailable (${response.status})`);
        return response.json();
      })
      .then((payload) => setState({ status: "available", data: designTrajectorySchema.parse(payload), error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "failed", data: null, error: error instanceof Error ? error.message : "Design artifact unavailable" });
      });
    return () => controller.abort();
  }, [active]);

  if (!active) return { status: "idle", data: null, error: null };
  return state.status === "idle" ? { status: "loading", data: null, error: null } : state;
}
