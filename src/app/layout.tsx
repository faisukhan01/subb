import type { Metadata, Viewport } from "next";
import { Outfit, Titan_One } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/** UI font — geometric, friendly, reads well at small sizes. */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

/** Display font — chunky arcade numerals/headers (logo, score, titles). */
const titanOne = Titan_One({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SUBB SURFERS — 3D Endless Runner",
  description:
    "Dodge trains, grab coins, and out-run the inspector in SUBB SURFERS — a full-stack 3D endless runner with global leaderboards, missions and power-ups.",
  keywords: ["endless runner", "3D game", "subway", "leaderboard", "WebGL", "Three.js"],
  authors: [{ name: "faisukhan01" }],
  icons: { icon: "/brand/og-cover.png" },
  openGraph: {
    title: "SUBB SURFERS",
    description: "Dodge trains, grab coins, out-run the inspector.",
    images: ["/brand/og-cover.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SUBB SURFERS",
    description: "Dodge trains, grab coins, out-run the inspector.",
    images: ["/brand/og-cover.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0c0a09",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables live on <html> so :root-level theme mappings
    // (--default-font-family, .font-display) resolve everywhere.
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${titanOne.variable}`}>
      <body className="antialiased bg-background text-foreground overscroll-none">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
