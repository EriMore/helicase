import type { Metadata } from "next";
import "molstar/build/viewer/molstar.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helicase Atlas — The Protein Universe",
  description: "Explore protein space. Make uncertainty visible. Design hypotheses with GPT-5.6.",
  icons: { icon: "/brand/logo/icon_white_svg.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
