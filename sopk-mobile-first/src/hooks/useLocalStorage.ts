"use client";

import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

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
