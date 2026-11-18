import type { Metadata } from "next";
import { SeaLab } from "./SeaLab";

export const metadata: Metadata = {
  title: "Sea lab, Trafalgar 1805",
  description: "Development page for Boulogne's painting (scene 2, beat 1).",
  robots: { index: false, follow: false },
};

export default function SeaLabPage() {
  return <SeaLab />;
}
