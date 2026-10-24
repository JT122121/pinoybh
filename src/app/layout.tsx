import type { Metadata, Viewport } from "next";
import { Archivo, Atkinson_Hyperlegible } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EmailLinkHandler } from "@/components/EmailLinkHandler";
import { VisitCounter } from "@/components/VisitCounter";
import { AdSense } from "@/components/AdSense";
import { COMMUNITY_STATEMENT } from "@/lib/constants";
import { configuredSiteUrl } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(configuredSiteUrl() ?? "http://localhost:3000"),
  title: { default: "PinoyBH", template: "%s | PinoyBH" },
  description: COMMUNITY_STATEMENT,
};

export const viewport: Viewport = { themeColor: "#13286b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${atkinson.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn btn-sun">
          Skip to content
        </a>
        <EmailLinkHandler />
        <VisitCounter />
        <AdSense />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
