"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SoundCue = "select" | "enter" | "query" | "back" | "tick" | "deny";
const CUE_STORAGE_KEY = "helicase.sound";
const AMBIENT_STORAGE_KEY = "helicase.ambient";
const FREQUENCIES: Record<SoundCue, number> = { select: 520, enter: 340, query: 440, back: 300, tick: 660, deny: 180 };

function readStored(key: string): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(key) === "on";
}

/**
 * `enabled`/`play` implement SOUND_SPEC.md exactly: short discrete cues, off by
 * default, never ambience. `ambientOn`/`toggleAmbient` are a deliberate,
 * explicit deviation from that spec, added on direct user request — a very
 * quiet, generative, opt-in drone, independent of the cue toggle. Recorded in
 * docs/handoff/DESIGN_DELTA.md.
 */
export function useSound() {
  const [enabled, setEnabled] = useState(() => readStored(CUE_STORAGE_KEY));
  const [ambientOn, setAmbientOn] = useState(() => readStored(AMBIENT_STORAGE_KEY));
  const context = useRef<AudioContext | null>(null);
  const ambientNodes = useRef<{ oscillators: OscillatorNode[]; gain: GainNode; lfo: OscillatorNode } | null>(null);

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
      window.localStorage.setItem(CUE_STORAGE_KEY, next ? "on" : "off");
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

  const stopAmbient = useCallback(() => {
    const nodes = ambientNodes.current;
    if (!nodes) return;
    const ctx = context.current;
    const now = ctx?.currentTime ?? 0;
    try {
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setTargetAtTime(0.0001, now, 0.6);
      window.setTimeout(() => {
        nodes.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch { /* already stopped */ } });
        nodes.lfo.stop();
      }, 1200);
    } catch { /* ignore */ }
    ambientNodes.current = null;
  }, []);

  const startAmbient = useCallback(() => {
    const ctx = ensureContext();
    if (!ctx || ambientNodes.current) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.connect(ctx.destination);
      // A very soft, slowly breathing two-note drone — texture, not melody.
      const oscillators = [110, 165].map((frequency) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.05;
      lfoGain.gain.value = 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      gain.gain.setTargetAtTime(0.012, ctx.currentTime, 1.5);
      ambientNodes.current = { oscillators, gain, lfo };
    } catch { /* Web Audio unavailable — ambient sound is a non-critical enhancement. */ }
  }, [ensureContext]);

  const toggleAmbient = useCallback(() => {
    setAmbientOn((current) => {
      const next = !current;
      window.localStorage.setItem(AMBIENT_STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }, []);

  useEffect(() => {
    if (ambientOn) startAmbient(); else stopAmbient();
  }, [ambientOn, startAmbient, stopAmbient]);

  useEffect(() => () => stopAmbient(), [stopAmbient]);

  return { enabled, toggle, play, ambientOn, toggleAmbient };
}
