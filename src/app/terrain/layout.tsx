import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "EMIS Terrain",
  description: "Relevé terrain J&T hors-ligne",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#C28B2D",
};

export default function TerrainRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
