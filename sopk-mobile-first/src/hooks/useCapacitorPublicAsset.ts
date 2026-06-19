"use client";

import { useEffect, useState } from "react";
import { capacitorPublicAsset } from "@/utils/capacitorStaticHref";
import { isCapacitorNative } from "@/utils/capacitorRuntime";

/** Résout un chemin `/public` après montage (build statique = plateforme web). */
export function useCapacitorPublicAsset(absPath: string): string {
  const [src, setSrc] = useState(absPath);

  useEffect(() => {
    if (!isCapacitorNative()) {
      setSrc(absPath);
      return;
    }
    setSrc(capacitorPublicAsset(absPath));
  }, [absPath]);

  return src;
}
