"use client";

type LoadingScreenProps = {
  theme: "light" | "dark";
  stageLabel: string;
  progress: number;
  resolvedCount: number;
};

export function LoadingScreen({ theme, stageLabel, progress, resolvedCount }: LoadingScreenProps) {
  const markSrc = theme === "light" ? "/brand/logo/icon_black_svg.svg" : "/brand/logo/icon_white_svg.svg";
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <div className="hx-loading">
      <div className="hx-loading-mark-wrap">
        <div className="hx-loading-scan" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} alt="Helicase" className="hx-loading-mark" />
      </div>
      <div className="hx-loading-info">
        <div className="hx-loading-stage mono">{stageLabel}</div>
        <div className="hx-loading-track"><div className="hx-loading-fill" style={{ width: `${pct}%` }} /></div>
        <div className="hx-loading-foot">
          <span className="hx-loading-detail mono">Resolved {resolvedCount.toLocaleString()} of 575,503 reviewed</span>
          <span className="hx-loading-pct mono">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
