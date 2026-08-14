"use client";

import Image from "next/image";

import { getTrackingTaskImage, TRACKING_TASK_IMAGES, type TrackingTaskKind } from "@/data/trackingImages";
import { useCapacitorPublicAsset } from "@/hooks/useCapacitorPublicAsset";

interface TrackingTaskImageProps {
  kind: TrackingTaskKind;
  size?: "banner" | "thumb";
}

export function TrackingTaskImage({ kind, size = "banner" }: TrackingTaskImageProps) {
  const src = useCapacitorPublicAsset(getTrackingTaskImage(kind));
  const alt = TRACKING_TASK_IMAGES[kind].alt;

  if (size === "thumb") {
    return (
      <Image
        src={src}
        alt={alt}
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 shrink-0 rounded-lg object-cover shadow-md ring-2 ring-white/40"
      />
    );
  }

  return (
    <div className="relative h-[3.25rem] w-full overflow-hidden bg-sky-100">
      <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 640px) 45vw, 180px" className="object-cover" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent"
        aria-hidden
      />
    </div>
  );
}
