import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { displayFace, textFace } from "@/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trafalgar 1805",
  description:
    "Dawn on 21 October 1805 off Cape Trafalgar: a scroll-driven story of the battle, told in scenes.",
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
