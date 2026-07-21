"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "helicase.onboarding.complete";

/**
 * First-run walkthrough state, persisted like useTheme/useSound: SSR-safe default
 * (assume complete so the overlay never flashes open before hydration), corrected
 * from localStorage on mount, then opened automatically once for a first-time
 * visitor as soon as the Atlas is ready. `replay()` reopens it on demand from the
 * header at any time without touching the persisted completion state.
 */
export function useOnboarding(ready: boolean) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [completed, setCompletedState] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedState(window.localStorage.getItem(STORAGE_KEY) === "done");
  }, []);

  useEffect(() => {
    if (ready && !completed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(0);
      setOpen(true);
    }
  }, [ready, completed]);

  const finish = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "done");
    setCompletedState(true);
    setOpen(false);
  }, []);

  const skip = useCallback(() => finish(), [finish]);

  const replay = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  return { open, step, setStep, finish, skip, replay };
}
