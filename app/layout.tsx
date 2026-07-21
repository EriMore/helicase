import type { Metadata } from "next";
import { IBM_Plex_Mono, Spectral } from "next/font/google";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spectral.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          // Read the persisted theme before first paint to avoid a flash of the default theme.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('helicase.theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
