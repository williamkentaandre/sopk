import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";

function localDayBoundsISO(d = new Date()): { start: string; end: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export type HealthStepsResult =
  | { ok: true; steps: number }
  | { ok: false; reason: "web" | "unavailable" | "denied" | "no_data" | "error"; message?: string };

/**
 * Lit le total de pas pour la journée locale (Santé iOS / Health Connect Android).
 * Peut ouvrir la feuille d’autorisation si `requestIfNeeded` est true.
 */
export async function fetchTodayStepCount(options?: { requestIfNeeded?: boolean }): Promise<HealthStepsResult> {
  const requestIfNeeded = options?.requestIfNeeded ?? false;
  const platform = Capacitor.getPlatform();
  if (platform === "web") {
    return { ok: false, reason: "web" };
  }

  try {
    const availability = await Health.isAvailable();
    if (!availability.available) {
      return { ok: false, reason: "unavailable", message: availability.reason };
    }

    let readAuthorized = false;
    const checked = await Health.checkAuthorization({ read: ["steps"] });
    readAuthorized = Boolean(checked.readAuthorized?.includes("steps"));

    if (!readAuthorized && requestIfNeeded) {
      const requested = await Health.requestAuthorization({ read: ["steps"], write: [] });
      readAuthorized = Boolean(requested.readAuthorized?.includes("steps"));
    }

    if (!readAuthorized) {
      return { ok: false, reason: "denied" };
    }

    const { start, end } = localDayBoundsISO();
    const { samples } = await Health.queryAggregated({
      dataType: "steps",
      startDate: start,
      endDate: end,
      bucket: "day",
      aggregation: "sum",
    });

    const raw = samples[0]?.value;
    if (typeof raw !== "number" || Number.isNaN(raw)) {
      return { ok: false, reason: "no_data" };
    }

    return { ok: true, steps: Math.max(0, Math.round(raw)) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "error", message };
  }
}
