import type { Metadata } from "next";
import { ShipLab } from "./ShipLab";

export const metadata: Metadata = {
  title: "Ship lab, Trafalgar 1805",
  description: "Development page for the ShipOfTheLine component.",
  robots: { index: false, follow: false },
};

export default function ShipLabPage() {
  return <ShipLab />;
}
