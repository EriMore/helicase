"use client";

type HeaderProps = {
  theme: "light" | "dark";
  releaseLabel: string;
  soundOn: boolean;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onHome: () => void;
};

export function Header({ theme, releaseLabel, soundOn, onToggleSound, onToggleTheme, onHome }: HeaderProps) {
  const lockupSrc = theme === "light" ? "/brand/logo/logo_full_black_svg.svg" : "/brand/logo/logo_full_white_svg.svg";
  return (
    <header className="hx-header">
      <div className="hx-brand hx-glass">
        <button type="button" onClick={onHome} aria-label="Return to the Universe" style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lockupSrc} alt="Helicase" className="hx-brand-word" style={{ height: 20 }} />
        </button>
      </div>
      <div className="hx-header-actions hx-glass">
        <span className="hx-status-chip mono">
          <span className="hx-status-dot" />
          {releaseLabel}
        </span>
        <button className="hx-toggle mono" onClick={onToggleSound}>{soundOn ? "SOUND ●" : "SOUND ○"}</button>
        <button className="hx-toggle hx-toggle-theme mono" onClick={onToggleTheme}>{theme === "light" ? "DARK" : "LIGHT"}</button>
      </div>
    </header>
  );
}
