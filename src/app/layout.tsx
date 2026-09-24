import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overscroll-none`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
