"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { useCapacitorPublicAsset } from "@/hooks/useCapacitorPublicAsset";
import { FOOD_BY_MEAL_TYPE, getMealImageUrl, isLocalMealImage } from "@/utils/mealImages";
import type { MealEntry } from "@/utils/types";

export function MealImage({
  meal,
  size = "md",
  hideImage = false,
}: {
  meal: Pick<MealEntry, "nom" | "type" | "image">;
  size?: "xs" | "md" | "hero";
  hideImage?: boolean;
}) {
  if (hideImage) return null;

  const primary = getMealImageUrl(meal);
  const isLocal = isLocalMealImage(primary);
  const localPrimarySrc = useCapacitorPublicAsset(isLocal ? primary : "/images/meal-dejeuner.svg");
  const fallbackSrc = FOOD_BY_MEAL_TYPE[meal.type];
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setUseFallback(false);
  }, [primary]);

  const displaySrc = useFallback ? fallbackSrc : isLocal ? localPrimarySrc : primary;

  if (size === "hero") {
    return (
      <div className="relative aspect-[16/10] max-h-44 w-full bg-violet-50">
        <Image
          src={displaySrc}
          alt=""
          fill
          unoptimized
          onError={() => {
            if (!useFallback) setUseFallback(true);
          }}
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
          aria-hidden
        />
      </div>
    );
  }

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
