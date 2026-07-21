"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "helicase.theme";

export function useTheme() {
  // Always starts at the SSR-safe default so the server-rendered and
  // hydration-pass markup match exactly. The beforeInteractive theme-init
  // script has already applied the real persisted theme to the DOM
  // attribute before first paint; the mount effect below only brings
  // React's own state in sync with it — it never writes the attribute
  // itself, so it can't flash the DOM back to the wrong theme for a frame.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // One-time correction from the DOM (already set pre-paint by the beforeInteractive
    // script) into React state — not a cascading re-render risk, just hydration sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (document.documentElement.getAttribute("data-theme") === "dark") setThemeState("dark");
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme: applyTheme, toggleTheme };
}
