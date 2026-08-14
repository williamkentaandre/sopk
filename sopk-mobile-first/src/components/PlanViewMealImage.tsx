"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useCapacitorPublicAsset } from "@/hooks/useCapacitorPublicAsset";
import { getMealImageUrl, isLocalMealImage, MEAL_TYPE_FALLBACK } from "@/utils/mealImages";
import type { MealEntry } from "@/utils/types";

export function MealImage({
  meal,
  size = "md",
  hideImage = false,
}: {
  meal: Pick<MealEntry, "nom" | "type" | "image">;
  size?: "xs" | "md";
  hideImage?: boolean;
}) {
  if (hideImage) return null;

  const primary = getMealImageUrl(meal);
  const isLocal = isLocalMealImage(primary);
  const localPrimarySrc = useCapacitorPublicAsset(primary);
  const fallbackSrc = useCapacitorPublicAsset(MEAL_TYPE_FALLBACK[meal.type]);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setUseFallback(false);
  }, [primary]);

  const displaySrc = useFallback ? fallbackSrc : isLocal ? localPrimarySrc : primary;

  return (
    <Image
      src={displaySrc}
      alt=""
      width={96}
      height={96}
      unoptimized
      onError={() => {
        if (!useFallback) setUseFallback(true);
      }}
      className={`shrink-0 rounded-lg object-cover shadow-md ring-2 ${
        size === "xs" ? "h-11 w-11 ring-white/40" : "h-14 w-14 ring-violet-200/60 sm:h-16 sm:w-16"
      }`}
    />
  );
}
