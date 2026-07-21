"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "helicase.onboarding";
type Stored = { invitationSeen: boolean; guideCompleted: boolean };

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { invitationSeen: false, guideCompleted: false };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return { invitationSeen: !!parsed.invitationSeen, guideCompleted: !!parsed.guideCompleted };
  } catch {
    return { invitationSeen: false, guideCompleted: false };
  }
}

function writeStored(next: Stored) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}

const INVITATION_DELAY_MS = 7000;

/**
 * First-run onboarding is optional and contextual, never a mandatory blocking modal:
 * the user can interact freely from the first frame. After a quiet delay (or never, if
 * they've already engaged with a control), a single small, dismissible invitation offers
 * a guided tour. Declining or completing it both persist — it never reappears
 * unannounced. The permanent header GUIDE entry can always replay it manually.
 */
export function useOnboarding(ready: boolean) {
  const [invitationVisible, setInvitationVisible] = useState(false);
  const [guideActive, setGuideActive] = useState(false);
  const dismissedRef = useRef(false);
  const interactedRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const stored = readStored();
    if (stored.invitationSeen || stored.guideCompleted) return;
    const timer = window.setTimeout(() => {
      if (!dismissedRef.current && !interactedRef.current) setInvitationVisible(true);
    }, INVITATION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  // Signs of hesitation (or confident early exploration) both resolve the same way: once the
  // user has meaningfully interacted with the scene, the delayed invitation is moot — the
  // interface already spoke for itself — so it does not interrupt them mid-action.
  const markInteracted = useCallback(() => { interactedRef.current = true; }, []);

  const declineInvitation = useCallback(() => {
    dismissedRef.current = true;
    setInvitationVisible(false);
    writeStored({ ...readStored(), invitationSeen: true });
  }, []);

  const acceptInvitation = useCallback(() => {
    dismissedRef.current = true;
    setInvitationVisible(false);
    writeStored({ ...readStored(), invitationSeen: true });
    setGuideActive(true);
  }, []);

  const openGuide = useCallback(() => {
    setInvitationVisible(false);
    setGuideActive(true);
  }, []);

  const finishGuide = useCallback(() => {
    setGuideActive(false);
    writeStored({ ...readStored(), invitationSeen: true, guideCompleted: true });
  }, []);

  return { invitationVisible, guideActive, markInteracted, declineInvitation, acceptInvitation, openGuide, finishGuide };
}
