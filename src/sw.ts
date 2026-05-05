/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

/**
 * Match toutes les variantes d'une URL terrain :
 * - /terrain, /terrain/...
 * - /terrain?_rsc=xxx (RSC payload Next.js)
 * - /_next/data/.../terrain/... (data fetch)
 */
const isTerrainUrl = (url: URL) =>
  url.pathname.startsWith("/terrain") || url.pathname.includes("/terrain");

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Routes terrain : StaleWhileRevalidate
    // Sert le cache instantanément si dispo, refresh en background si online.
    // Tolère bien le offline une fois la route visitée au moins 1 fois online.
    {
      matcher: ({ url }: { url: URL }) => isTerrainUrl(url),
      handler: new StaleWhileRevalidate({
        cacheName: "terrain-pages",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // Static Next.js : CacheFirst
    {
      matcher: /\/_next\/static\/.*/,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // Polices Google
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

// Background sync : ping les clients quand connectivité revient
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
