"use client";

type HeaderProps = {
  theme: "light" | "dark";
  releaseLabel: string;
  soundOn: boolean;
  onToggleSound: () => void;
  ambientOn: boolean;
  onToggleAmbient: () => void;
  onToggleTheme: () => void;
  onHome: () => void;
  showBack: boolean;
  onBack: () => void;
  onOpenGuide: () => void;
};

export function Header({ theme, releaseLabel, soundOn, onToggleSound, ambientOn, onToggleAmbient, onToggleTheme, onHome, showBack, onBack, onOpenGuide }: HeaderProps) {
  const markSrc = theme === "light" ? "/brand/logo/icon_black_svg.svg" : "/brand/logo/icon_white_svg.svg";
  const wordSrc = theme === "light" ? "/brand/logo/word_black.png" : "/brand/logo/word_white.png";
  return (
    <header className="hx-header">
      <div className="hx-header-left">
        <button type="button" className="hx-brand hx-glass" onClick={onHome} aria-label="Return to the Universe" style={{ border: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markSrc} alt="" className="hx-brand-mark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordSrc} alt="HELICASE" className="hx-brand-word" />
        </button>
        {showBack && (
          <button type="button" className="hx-back hx-glass mono" onClick={onBack} aria-label="Back one level">‹ BACK</button>
        )}
      </div>
      <div className="hx-header-actions hx-glass">
        <span className="hx-status-chip mono">
          <span className="hx-status-dot" />
          {releaseLabel}
        </span>
        <button className="hx-toggle hx-guide-entry mono" onClick={onOpenGuide} aria-label="Replay the guided tour">GUIDE</button>
        <button className="hx-toggle mono" onClick={onToggleSound}>{soundOn ? "SOUND ●" : "SOUND ○"}</button>
        <button className="hx-toggle mono" onClick={onToggleAmbient} title="Ambient soundscape (off by default, independent of cue sounds)">{ambientOn ? "AMBIENT ●" : "AMBIENT ○"}</button>
        <button className="hx-toggle hx-toggle-theme mono" onClick={onToggleTheme}>{theme === "light" ? "DARK" : "LIGHT"}</button>
      </div>
    </header>
  );
}
