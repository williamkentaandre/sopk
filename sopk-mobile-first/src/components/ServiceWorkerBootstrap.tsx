"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Web : enregistre le SW PWA en prod uniquement.
 * Natif (Capacitor) : désinscrit tout SW — sinon les navigations vers `/plan/` etc. peuvent être
 * interceptées avant que `AppShell` ne soit monté (ex. page marketing `/`).
 */
export function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isNative = Capacitor.getPlatform() !== "web";

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
