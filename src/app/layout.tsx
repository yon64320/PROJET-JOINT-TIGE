import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "EMIS — Préparation d'arrêts",
  description: "Application de préparation d'arrêts de maintenance industrielle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={outfit.variable}>
      <body className="antialiased bg-mcm-cream text-mcm-charcoal font-sans">{children}</body>
    </html>
  );
}
