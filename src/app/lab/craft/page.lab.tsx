import type { Metadata } from "next";
import { CraftLab } from "./CraftLab";

export const metadata: Metadata = {
  title: "Craft lab, Trafalgar 1805",
  description:
    "Development page for the flotilla's craft at hero size (the Craft component).",
  robots: { index: false, follow: false },
};

export default function CraftLabPage() {
  return <CraftLab />;
}
