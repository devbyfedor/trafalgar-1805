import type { Metadata } from "next";
import { Experience } from "@/components/experience/Experience";
import { SITE } from "@/lib/site";

/** The link preview for messengers and social networks, and the canonical address. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    locale: "en_GB",
    images: [{ ...SITE.preview, type: "image/jpeg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    images: [{ url: SITE.preview.url, alt: SITE.preview.alt }],
  },
};

export default function Home() {
  return <Experience />;
}
