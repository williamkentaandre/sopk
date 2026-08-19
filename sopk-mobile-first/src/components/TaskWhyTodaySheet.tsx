"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { MealImage } from "@/components/PlanViewMealImage";
import { TrackingTaskImage } from "@/components/TrackingTaskImage";
import type { TrackingTaskKind } from "@/data/trackingImages";
import type { MealEntry } from "@/utils/types";

export type TaskWhyTodayImage =
  | { type: "meal"; meal: Pick<MealEntry, "nom" | "type" | "image">; hideImage?: boolean }
  | { type: "tracking"; kind: TrackingTaskKind };

export interface TaskWhyTodaySheetState {
  subtitle: string;
  explanation: string;
  image?: TaskWhyTodayImage;
}

interface TaskWhyTodaySheetProps {
  open: TaskWhyTodaySheetState | null;
  onClose: () => void;
}

export function TaskWhyTodaySheet({ open, onClose }: TaskWhyTodaySheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-why-title"
        className="relative max-h-[min(72vh,520px)] overflow-y-auto rounded-t-[1.35rem] bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.28)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
        <p id="task-why-title" className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">
          Pourquoi aujourd&apos;hui ?
        </p>
        <p className="mt-1.5 text-base font-semibold leading-snug text-slate-900">{open.subtitle}</p>
        {open.image?.type === "meal" && !open.image.hideImage ? (
          <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200/80">
            <MealImage meal={open.image.meal} size="hero" />
          </div>
        ) : null}
        {open.image?.type === "tracking" ? (
          <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200/80">
            <TrackingTaskImage kind={open.image.kind} size="banner" />
          </div>
        ) : null}
        <div className="mt-3 space-y-2.5">
          {open.explanation.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-[15px] leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-brand-700 py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          Compris
        </button>
      </div>
    </div>,
    document.body,
  );
}

interface TaskWhyTodayTriggerProps {
  onOpen: () => void;
  className?: string;
}

/** Bouton discret sur la carte - ouvre le panneau bas. */
export function TaskWhyTodayTrigger({ onOpen, className }: TaskWhyTodayTriggerProps) {
  return (
    <button
      type="button"
      aria-label="Pourquoi aujourd’hui ?"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onOpen();
      }}
      className={`absolute z-[3] rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-800 shadow-md ring-1 ring-white/80 transition active:scale-95 ${className ?? "left-1.5 top-1.5"}`}
    >
      Pourquoi ?
    </button>
  );
}
