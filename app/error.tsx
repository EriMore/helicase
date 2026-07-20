"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Helicase recovery boundary", error); }, [error]);
  return <main className="fatal-recovery" role="alert">
    <p>ATLAS RECOVERY</p>
    <h1>The instrument lost one of its active systems.</h1>
    <p>The failure is isolated. Retry the scene without changing scientific data or provenance.</p>
    <button onClick={reset}>Retry Atlas</button>
  </main>;
}
