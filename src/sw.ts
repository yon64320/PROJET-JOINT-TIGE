/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /^\/terrain(\/.*)?$/,
      handler: new NetworkFirst({
        cacheName: "terrain-pages",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\/_next\/static\/.*/,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Background sync for mutations when connectivity returns
self.addEventListener("sync", (event) => {
  const syncEvent = event as ExtendableEvent & { tag?: string };
  if (syncEvent.tag === "terrain-sync") {
    syncEvent.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          if (client.url.includes("/terrain")) {
            client.postMessage({ type: "TRIGGER_SYNC" });
          }
        }
      })(),
    );
  }
});
