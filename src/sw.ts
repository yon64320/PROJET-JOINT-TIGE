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
 * Match les pages /terrain (HTML + RSC payloads), pas les API.
 *
 * Important : exclure les méthodes != GET et les routes /api/* qui contiennent
 * "terrain" dans leur path (ex: /api/terrain/sync). Sinon le SW intercepte les
 * fetch API et casse le wizard avec ERR_FAILED.
 */
const isTerrainPageRequest = ({ url, request }: { url: URL; request: Request }) =>
  request.method === "GET" &&
  url.pathname.startsWith("/terrain") &&
  !url.pathname.startsWith("/api");

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Pages /terrain : StaleWhileRevalidate
    // Sert le cache instantanément si dispo, refresh en background si online.
    // Tolère bien le offline une fois la page visitée au moins 1 fois online.
    {
      matcher: isTerrainPageRequest,
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
