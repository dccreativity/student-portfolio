import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { CRITICAL_CSS, TAILWIND_CDN_SRC, TAILWIND_CONFIG } from "@/lib/tailwindCdn";
import "./globals.css";

// Self-hosted by Next at build time: no CDN request for the fonts, and no
// flash of fallback text.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// One title for the whole site. Every page — sign-in, dashboard, a
// section, the resume — shows "ADIS Student Portfolio" in the tab, so the
// browser tab reads the same wherever a student or admin happens to be.
// The school crest that sits beside it comes from app/icon.png,
// app/apple-icon.png and app/favicon.ico, which Next serves automatically.
export const metadata = {
  title: "ADIS Student Portfolio",
  description:
    "One place for every Adani International School student to build, showcase and share their academic journey.",
};

export const viewport = {
  themeColor: "#F4EFFA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
        {/* Tailwind from the CDN. These are plain, render-blocking head
            tags on purpose: next/script's beforeInteractive defers into a
            post-hydration queue in the App Router, which would leave the
            first paint unstyled. Order matters — the CDN script defines
            the `tailwind` global that the config line then assigns to. */}
        <script src={TAILWIND_CDN_SRC} />
        <script dangerouslySetInnerHTML={{ __html: TAILWIND_CONFIG }} />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
