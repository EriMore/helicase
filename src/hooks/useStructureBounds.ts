"use client";

import { useEffect, useState } from "react";

const MARGIN = 26;

export type StructureBounds = { left: number | null; right: number | null };

/**
 * Measures the real DOM edges of the identity panel (left) and whichever
 * structure-side panel is mounted (Inspect or Design, right) so the Mol*
 * viewport can be centered in the space actually left over between them,
 * not against the full browser width. Recomputes on resize and whenever the
 * panels themselves change size (representation/color-mode chip rows differ
 * in height, Inspect vs Design differ in width, and Inspect/Design swap the
 * right-side DOM node entirely — `variant` should be a key, e.g. scene mode,
 * that changes across those transitions so this effect re-attaches).
 */
export function useStructureBounds(active: boolean, variant: string): StructureBounds {
  const [bounds, setBounds] = useState<StructureBounds>({ left: null, right: null });

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBounds({ left: null, right: null });
      return;
    }
    const recompute = () => {
      const leftPanel = document.querySelector(".hx-identity") as HTMLElement | null;
      const rightPanel = document.querySelector(".hx-inspect, .hx-design") as HTMLElement | null;
      const left = leftPanel ? leftPanel.getBoundingClientRect().right + MARGIN : null;
      const right = rightPanel ? window.innerWidth - rightPanel.getBoundingClientRect().left + MARGIN : null;
      setBounds({ left, right });
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    const leftEl = document.querySelector(".hx-identity");
    const rightEl = document.querySelector(".hx-inspect, .hx-design");
    if (leftEl) observer.observe(leftEl);
    if (rightEl) observer.observe(rightEl);
    window.addEventListener("resize", recompute);
    // A couple of deferred re-measures cover panels that mount/resize a frame
    // after this effect runs (e.g. tab switches changing identity-panel height).
    const raf1 = requestAnimationFrame(recompute);
    const timer = window.setTimeout(recompute, 120);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
      cancelAnimationFrame(raf1);
      window.clearTimeout(timer);
    };
  }, [active, variant]);

  return bounds;
}
