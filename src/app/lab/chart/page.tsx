import type { Metadata } from "next";
import { ChartLab } from "./ChartLab";

export const metadata: Metadata = {
  title: "Chart lab, Trafalgar 1805",
  description: "Development page for the 3D sea chart engine.",
  robots: { index: false, follow: false },
};

export default function ChartLabPage() {
  return <ChartLab />;
}
