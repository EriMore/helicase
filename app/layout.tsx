import type { Metadata } from "next";
import { IBM_Plex_Mono, Spectral } from "next/font/google";
import Script from "next/script";
import "molstar/build/viewer/molstar.css";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Helicase Atlas — The Protein Universe",
  description: "Explore the protein universe. Make uncertainty visible. Design hypotheses with GPT-5.6.",
  icons: { icon: "/brand/logo/icon_white_svg.svg" },
};

const themeInitScript = "try{var t=localStorage.getItem('helicase.theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spectral.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">{themeInitScript}</Script>
        {children}
      </body>
    </html>
  );
}
