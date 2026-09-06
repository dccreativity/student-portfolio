import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time: no CDN request, no flash of fallback
// text, and the site keeps its typography even on a slow connection.
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

export const metadata = {
  title: "folio. — Student Portfolio",
  description:
    "One place for every Adani International School student to build, showcase and share their academic journey.",
};

export const viewport = {
  themeColor: "#F6EFE6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
