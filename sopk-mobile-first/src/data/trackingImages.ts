import { publicImagePath } from "@/utils/publicImagePath";

/** Photos des cartes suivi eau / pas (mission du jour). */

export type TrackingTaskKind = "water" | "steps";

export const TRACKING_TASK_IMAGES: Record<TrackingTaskKind, { path: string; alt: string }> = {
  water: {
    path: "/images/tracking/eau.jpg",
    alt: "Verre d'eau",
  },
  steps: {
    path: "/images/tracking/pas-marche.jpg",
    alt: "Pied en marche",
  },
};

export function getTrackingTaskImage(kind: TrackingTaskKind): string {
  return publicImagePath(TRACKING_TASK_IMAGES[kind].path);
}
