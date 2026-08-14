"use client";

import { memo, useEffect, useRef } from "react";

interface CustomDeviationFormProps {
  onSubmit: (entry: { label: string; kcal: number }) => void;
  onClose: () => void;
}

/** Formulaire isolé - champs non contrôlés pour éviter les re-renders à chaque frappe (iOS). */
export const CustomDeviationForm = memo(function CustomDeviationForm({
  onSubmit,
  onClose,
}: CustomDeviationFormProps) {
  const labelRef = useRef<HTMLInputElement>(null);
  const kcalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => labelRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  function handleSubmit() {
    const kcal = Number(kcalRef.current?.value);
    if (!Number.isFinite(kcal) || kcal < 10 || kcal > 3000) return;
    const label = labelRef.current?.value.trim() || "Autre écart calorique";
    onSubmit({ label, kcal: Math.round(kcal) });
    onClose();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-[0_8px_24px_rgba(217,119,6,0.1)]">
      <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-3 py-2">
        <p className="text-[12px] font-bold text-amber-950">Écart personnalisé</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-white hover:text-slate-800"
        >
          Fermer
        </button>
      </div>
      <div className="space-y-2.5 p-3">
        <input
          ref={labelRef}
          type="text"
          defaultValue=""
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
          placeholder="Ex. brunch, apéro prolongé…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        <div className="flex items-center gap-2">
          <input
            ref={kcalRef}
            type="number"
            inputMode="numeric"
            min={10}
            max={3000}
            defaultValue=""
            autoComplete="off"
            enterKeyHint="done"
            placeholder="kcal"
            className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] tabular-nums text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <span className="text-[12px] font-medium text-slate-500">kcal en plus</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-brand-700 to-brand-600 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(109,90,125,0.35)] active:scale-[0.99]"
        >
          Ajouter l&apos;écart
        </button>
      </div>
    </div>
  );
});
