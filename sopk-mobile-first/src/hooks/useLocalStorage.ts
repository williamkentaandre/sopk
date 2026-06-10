"use client";

import { useLayoutEffect, useRef, useState } from "react";

function readFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  const [value, setValue] = useState<T>(() => readFromLocalStorage(key, initialValue));

  /** Quand la clé change (ex. guest → compte Apple), relire le slot — indispensable après déconnexion / reconnexion. */
  useLayoutEffect(() => {
    setValue(readFromLocalStorage(key, initialRef.current));
  }, [key]);

  const update = (nextValue: T) => {
    setValue(nextValue);
    try {
      window.localStorage.setItem(key, JSON.stringify(nextValue));
    } catch {
      // Some mobile/private contexts block localStorage writes.
      // Keep in-memory state usable so app flow still works.
    }
  };

  return { value, update };
}
