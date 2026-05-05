import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ["playwright"],
  experimental: {
    optimizePackageImports: [
      "@univerjs/presets",
      "@univerjs/preset-sheets-core",
      "@univerjs/preset-sheets-data-validation",
      "@univerjs/preset-sheets-conditional-formatting",
    ],
  },
};

export default withSerwist(withBundleAnalyzer(nextConfig));
