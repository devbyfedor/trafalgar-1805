import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { displayFace, textFace } from "@/fonts";
import { SITE } from "@/lib/site";
import "./globals.css";

// The icons are files beside this one: favicon.ico and apple-icon.png
// (scripts/dev/icons.mjs), linked by Next.js. The home page adds the link
// preview and the canonical address (page.tsx).
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.name,
  description: SITE.description,
  applicationName: SITE.name,
};

export const viewport: Viewport = {
  themeColor: "#1e2a3a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${displayFace.variable} ${textFace.variable}`}>
      <body>{children}</body>
    </html>
  );
}
