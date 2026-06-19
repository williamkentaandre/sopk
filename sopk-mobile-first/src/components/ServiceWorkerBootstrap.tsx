"use client";

import { useEffect } from "react";
import { isCapacitorNative } from "@/utils/capacitorRuntime";

/**
 * Web : enregistre le SW PWA en prod uniquement.
 * Natif (Capacitor) : désinscrit tout SW — sinon les navigations vers `/plan/` etc. peuvent être
 * interceptées avant que `AppShell` ne soit monté (ex. page marketing `/`).
 */
export function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isNative = isCapacitorNative();

    if (isNative) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      return undefined;
    });
  }, []);

  return null;
}
