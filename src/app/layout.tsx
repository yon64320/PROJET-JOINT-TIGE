import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body className="antialiased bg-slate-50 text-slate-900">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <a href="/projets" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="font-semibold text-slate-900">
                  EMIS <span className="text-slate-400 font-normal">| Préparation d&apos;arrêts</span>
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
