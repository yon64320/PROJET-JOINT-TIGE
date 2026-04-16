import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["node_modules", ".next", "dist", "build"],
  },
  {
    files: ["src/**/*.{js,ts,tsx,jsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        File: "readonly",
        Blob: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        alert: "readonly",
        confirm: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLCanvasElement: "readonly",
        ResizeObserver: "readonly",
        CanvasRenderingContext2D: "readonly",
        MouseEvent: "readonly",
        Node: "readonly",
        Request: "readonly",
        Response: "readonly",
        BeforeUnloadEvent: "readonly",
        MessageEvent: "readonly",
        ServiceWorkerContainer: "readonly",
        ServiceWorkerRegistration: "readonly",
        // Node.js globals
        process: "readonly",
        crypto: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        // React globals
        React: "readonly",
        // Service Worker globals
        ServiceWorkerGlobalScope: "readonly",
        ExtendableEvent: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
    },
  },
];
