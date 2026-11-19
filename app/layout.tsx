import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// The font variable sits on <html>: the App shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ledger | THB invoice draft | Bookchaowalit",
  description: "Build and review a local THB invoice draft in the browser: parties, line items, optional VAT and withholding tax, copy or print.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  openGraph: { type: "website", url: "/", siteName: "Bookchaowalit", title: "Ledger | THB invoice draft", description: "A local THB invoice draft desk. Nothing leaves the browser." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={geistSans.variable}><body>{children}</body></html>;
}
