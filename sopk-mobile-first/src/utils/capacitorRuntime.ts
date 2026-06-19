import { Capacitor } from "@capacitor/core";

/** Vrai appareil Capacitor (pas le navigateur). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const protocol = window.location.protocol;
  return protocol === "capacitor:" || protocol === "ionic:";
}

export function isCapacitorIos(): boolean {
  if (!isCapacitorNative()) return false;
  return Capacitor.getPlatform() === "ios" || /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isCapacitorAndroid(): boolean {
  if (!isCapacitorNative()) return false;
  return Capacitor.getPlatform() === "android";
}
