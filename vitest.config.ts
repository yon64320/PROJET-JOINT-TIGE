import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__tests__/**",
        "src/sw.ts",
        "src/proxy.ts",
        "src/types/**",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
      ],
      thresholds: {
        // Plancher initial — réaliste vs surface couverte (~6 % des fichiers).
        // Engagement : monter à 50 / 50 / 50 / 40 d'ici 3 mois.
        lines: 25,
        functions: 25,
        statements: 25,
        branches: 20,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
