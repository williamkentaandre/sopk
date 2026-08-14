"use client";

import Image from "next/image";

import { getDeviationPresetImage } from "@/data/foodPreferenceCatalog";
import { useCapacitorPublicAsset } from "@/hooks/useCapacitorPublicAsset";

interface DeviationPresetImageProps {
  presetId?: string;
  label?: string;
  size?: "xs" | "sm" | "card";
}

export function DeviationPresetImage({ presetId, label, size = "sm" }: DeviationPresetImageProps) {
  const imagePath = getDeviationPresetImage(presetId, label);
  const src = useCapacitorPublicAsset(imagePath);
  const alt = label?.trim() || "Écart alimentaire";

  if (size === "card") {
    return (
      <div className="relative h-[4.75rem] w-full overflow-hidden bg-amber-100 sm:h-[5.25rem]">
        <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 640px) 45vw, 180px" className="object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden />
      </div>
    );
  }

  const sizeClass = size === "xs" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl";

  return (
    <Image
      src={src}
      alt={alt}
      width={44}
      height={44}
      unoptimized
      className={`shrink-0 object-cover ring-1 ring-amber-200/80 ${sizeClass}`}
    />
  );
}
