import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NutriSOPK",
    short_name: "NutriSOPK",
    description:
      "Application mobile-first SOPK avec onboarding, plan repas 7 jours, suivi quotidien et hydratation.",
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
