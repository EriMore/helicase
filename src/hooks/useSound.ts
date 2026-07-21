"use client";

import { useCallback, useRef, useState } from "react";

export type SoundCue = "select" | "enter" | "query" | "back" | "tick" | "deny";
const STORAGE_KEY = "helicase.sound";
const FREQUENCIES: Record<SoundCue, number> = { select: 520, enter: 340, query: 440, back: 300, tick: 660, deny: 180 };

function readStoredSound(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "on";
}

export function useSound() {
  const [enabled, setEnabled] = useState(readStoredSound);
  const context = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(() => {
    if (context.current) return context.current;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    context.current = new AudioContextCtor();
    return context.current;
  }, []);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      if (next) ensureContext();
      return next;
    });
  }, [ensureContext]);

  const play = useCallback((cue: SoundCue) => {
    if (!enabled) return;
    const ctx = ensureContext();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = FREQUENCIES[cue];
      oscillator.type = "sine";
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch {
      // Web Audio can throw in restricted/automation contexts — sound is a non-critical enhancement.
    }
  }, [enabled, ensureContext]);

  return { enabled, toggle, play };
}
