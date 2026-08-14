"use client";

import { memo, startTransition, useCallback, useState } from "react";

import { INDULGENCE_PRESETS } from "@/data/foodPreferenceCatalog";
import { formatGainGramsLabel, formatLossGramsLabel } from "@/utils/weightSummary";
import type { DeviationEntry } from "@/utils/types";
import { buildMealAdjustment } from "@/utils/meal-adjustment";

import { CustomDeviationForm } from "./CustomDeviationForm";
import { DeviationPresetImage } from "./DeviationPresetImage";

interface DeviationAddPayload {
  label: string;
  kcal: number;
  presetId?: string;
}

interface DayDeviationsPanelProps {
  canEdit: boolean;
  deviations: DeviationEntry[];
  totalKcal: number;
  penaltyGrams: number;
  surplusGrams: number;
  selectedDayLossGrams: number;
  startedAboveStartWeight: boolean;
  onAdd: (entry: DeviationAddPayload) => void;
  onRemove: (entryId: string) => void;
}

const DeviationPresetGrid = memo(function DeviationPresetGrid({
  onAdd,
}: {
  onAdd: (entry: DeviationAddPayload) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {INDULGENCE_PRESETS.map(({ id, label, kcal }) => (
        <button
          key={id}
          type="button"
          onClick={() => onAdd({ label, kcal, presetId: id })}
          className="group overflow-hidden rounded-xl border border-amber-200/80 bg-white text-left shadow-[0_2px_10px_rgba(217,119,6,0.08)] active:scale-[0.98]"
        >
          <DeviationPresetImage presetId={id} label={label} size="card" />
          <span className="block px-2.5 pb-2.5 pt-2">
            <span className="block truncate text-[12px] font-bold text-slate-900">{label}</span>
            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-900">
              +{kcal} kcal
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});

const DeviationEntryList = memo(function DeviationEntryList({
  deviations,
  canEdit,
  onRemove,
}: {
  deviations: DeviationEntry[];
  canEdit: boolean;
  onRemove: (entryId: string) => void;
}) {
  if (deviations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/30 px-3 py-4 text-center">
        <p className="text-[12px] font-medium text-amber-900/70">Aucun écart noté pour ce jour.</p>
        <p className="mt-0.5 text-[11px] text-amber-800/60">Un verre, un dessert ? Ajoutez-le en un tap.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Enregistrés aujourd&apos;hui</p>
      <ul className="mt-2 space-y-2">
        {deviations.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm"
          >
            <DeviationPresetImage presetId={entry.presetId} label={entry.label} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-900">{entry.label}</p>
              <p className="text-[11px] font-medium tabular-nums text-amber-800">+{entry.kcal} kcal</p>
            </div>
            {canEdit ? (
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 active:bg-rose-50"
              >
                Retirer
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
});

const DeviationImpactSummary = memo(function DeviationImpactSummary({
  totalKcal,
  penaltyGrams,
  surplusGrams,
  selectedDayLossGrams,
  startedAboveStartWeight,
}: {
  totalKcal: number;
  penaltyGrams: number;
  surplusGrams: number;
  selectedDayLossGrams: number;
  startedAboveStartWeight: boolean;
}) {
  if (totalKcal <= 0) return null;

  const adjustmentHint = buildMealAdjustment(0, totalKcal).action;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/70">Impact sur le bilan</p>
      {startedAboveStartWeight ? (
        <p className="mt-1 text-[12px] font-semibold leading-snug text-amber-950">
          Au-dessus du poids de départ :{" "}
          <span className="tabular-nums text-amber-800">{formatGainGramsLabel(surplusGrams)}</span> estimés
          aujourd&apos;hui
          {selectedDayLossGrams > 0 ? (
            <>
              {" "}
              · adhérence du jour{" "}
              <span className="tabular-nums text-emerald-800">{formatLossGramsLabel(selectedDayLossGrams)}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-1 text-[12px] font-semibold leading-snug text-amber-950">
          Perte estimée réduite de <span className="tabular-nums">{penaltyGrams} g</span>
          {selectedDayLossGrams > 0 ? (
            <>
              {" "}
              · net du jour{" "}
              <span className="tabular-nums text-emerald-800">{formatLossGramsLabel(selectedDayLossGrams)}</span>
            </>
          ) : surplusGrams > 0 ? (
            <>
              {" "}
              · excédent <span className="tabular-nums">{formatGainGramsLabel(surplusGrams)}</span>
            </>
          ) : null}
        </p>
      )}
      {adjustmentHint ? (
        <p className="mt-1 text-[11px] leading-snug text-amber-900/75">{adjustmentHint}</p>
      ) : null}
    </div>
  );
});

export const DayDeviationsPanel = memo(function DayDeviationsPanel({
  canEdit,
  deviations,
  totalKcal,
  penaltyGrams,
  surplusGrams,
  selectedDayLossGrams,
  startedAboveStartWeight,
  onAdd,
  onRemove,
}: DayDeviationsPanelProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);

  const openCustomForm = useCallback(() => {
    startTransition(() => setShowCustomForm(true));
  }, []);

  const closeCustomForm = useCallback(() => {
    setShowCustomForm(false);
  }, []);

  const handleCustomSubmit = useCallback(
    (entry: { label: string; kcal: number }) => {
      onAdd(entry);
      setShowCustomForm(false);
    },
    [onAdd],
  );

  return (
    <div className="overflow-hidden">
      <div className="border-b border-brand-700/40 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-eyebrow text-brand-200/80">Journal du jour</p>
            <p className="mt-0.5 text-section-title text-white">Écarts &amp; indulgences</p>
            <p className="text-body mt-1 text-brand-100/75">
              Notez ce qui sort du plan - le bilan ajuste votre estimation de poids.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/10 px-2.5 py-2 text-right ring-1 ring-white/15">
            <p className="text-eyebrow text-brand-200/70">Total</p>
            <p className="text-[18px] font-black tabular-nums leading-none text-white">
              {totalKcal}
              <span className="text-[10px] font-semibold"> kcal</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-gradient-to-b from-brand-50/30 to-white px-4 py-4">
        {canEdit ? (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/60">Ajouter rapidement</p>
              <DeviationPresetGrid onAdd={onAdd} />
              {!showCustomForm ? (
                <button
                  type="button"
                  onClick={openCustomForm}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300/90 bg-amber-50/50 py-2.5 text-[12px] font-semibold text-amber-950 active:bg-amber-100"
                >
                  <span aria-hidden>✏️</span>
                  Autre écart calorique
                </button>
              ) : null}
            </div>

            {showCustomForm ? (
              <CustomDeviationForm onSubmit={handleCustomSubmit} onClose={closeCustomForm} />
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
            Modification possible sur les jours passés et aujourd&apos;hui.
          </p>
        )}

        <DeviationEntryList deviations={deviations} canEdit={canEdit} onRemove={onRemove} />

        <DeviationImpactSummary
          totalKcal={totalKcal}
          penaltyGrams={penaltyGrams}
          surplusGrams={surplusGrams}
          selectedDayLossGrams={selectedDayLossGrams}
          startedAboveStartWeight={startedAboveStartWeight}
        />
      </div>
    </div>
  );
});
