import { STORAGE_KEYS } from "@/utils/storage";

export function entitlementStorageKey(userId: string) {
  return `${STORAGE_KEYS.entitlement}_${userId}`;
}

export function readEntitlement(userId: string | null | undefined): boolean {
  if (!userId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(entitlementStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeEntitlement(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(entitlementStorageKey(userId), "1");
  } catch {
    /* ignore */
  }
}
