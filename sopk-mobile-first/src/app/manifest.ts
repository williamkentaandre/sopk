import { MetadataRoute } from "next";

import { APP_MANIFEST_NAME, APP_NAME } from "@/config/appBrand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_MANIFEST_NAME,
    short_name: APP_NAME,
    description:
      "Application mobile-first SOPK avec onboarding, plan repas 30 jours, suivi quotidien et hydratation.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7ff",
    theme_color: "#6d28d9",
    lang: "fr",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/maskable-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
