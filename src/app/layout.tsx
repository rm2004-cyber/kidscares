import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/seo";

/* Baloo 2 for display (rounded, friendly), Nunito for body (highly legible). */
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    // Every page supplies only its own name; the suffix is applied here.
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "kids online shopping",
    "baby products",
    "kids clothing",
    "kids footwear",
    "toys for kids",
    "soft toys",
    "baby daily needs",
    "kids store india",
  ],
  authors: [{ name: SITE.name }],
  category: "shopping",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image", site: SITE.twitter },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f74d3f",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout holds only the document shell. Storefront chrome lives in
 * `(shop)/layout.tsx` and the admin chrome in `admin/layout.tsx`, so the two
 * surfaces do not inherit each other's header, footer or tab bar.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
