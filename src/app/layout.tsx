import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "EMIS — Préparation d'arrêts",
  description:
    "Application de préparation d'arrêts de maintenance industrielle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={outfit.variable}>
      <body className="antialiased bg-mcm-cream text-mcm-charcoal font-sans">
        <nav className="bg-mcm-warm-white border-b border-mcm-warm-gray-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <a href="/projets" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mcm-mustard rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="font-semibold text-mcm-charcoal">
                  EMIS <span className="text-mcm-warm-gray-light font-normal">| Préparation d&apos;arrêts</span>
                </span>
              </a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
