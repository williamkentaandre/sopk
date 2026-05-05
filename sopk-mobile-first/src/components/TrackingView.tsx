"use client";

import { SectionCard } from "@/components/SectionCard";
import { DailyTrackingData } from "@/utils/types";

interface TrackingViewProps {
  tracking: DailyTrackingData;
  onUpdate: (next: DailyTrackingData) => void;
}

const moodLabels = ["😞", "😐", "🙂", "😊", "🤩"];

export function TrackingView({ tracking, onUpdate }: TrackingViewProps) {
  const score = Math.round(((tracking.energie + (6 - tracking.fringales) + tracking.humeur) / 15) * 100);

  return (
    <div className="space-y-4">
      <SectionCard title="Suivi quotidien" subtitle="Renseigne tes indicateurs pour ajuster tes habitudes.">
        <div className="grid grid-cols-1 gap-3">
          <RangeField
            label="Humeur"
            value={tracking.humeur}
            onChange={(next) => onUpdate({ ...tracking, humeur: next as DailyTrackingData["humeur"] })}
          />
          <RangeField
            label="Énergie"
            value={tracking.energie}
            onChange={(next) => onUpdate({ ...tracking, energie: next as DailyTrackingData["energie"] })}
          />
          <RangeField
            label="Fringales"
            value={tracking.fringales}
            onChange={(next) => onUpdate({ ...tracking, fringales: next as DailyTrackingData["fringales"] })}
          />
          <label className="text-sm font-medium text-slate-700">
            Sommeil (heures)
            <input
              type="number"
              min={3}
              max={12}
              value={tracking.sommeilHeures}
              onChange={(e) => onUpdate({ ...tracking, sommeilHeures: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Pas du jour
            <input
              type="number"
              min={0}
              max={30000}
              value={tracking.pas}
              onChange={(e) => onUpdate({ ...tracking, pas: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 outline-none focus:border-violet-500"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-violet-100 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={tracking.repasSuivis}
              onChange={(e) => onUpdate({ ...tracking, repasSuivis: e.target.checked })}
            />
            J’ai suivi mes repas prévus aujourd’hui
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Score bien-être du jour">
        <div className="flex items-center justify-between rounded-xl bg-violet-50 p-3">
          <div>
            <p className="text-sm text-violet-700">Score global</p>
            <p className="text-3xl font-bold text-violet-800">{score}%</p>
          </div>
          <p className="text-3xl">{moodLabels[tracking.humeur - 1]}</p>
        </div>
      </SectionCard>
    </div>
  );
}

interface RangeFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function RangeField({ label, value, onChange }: RangeFieldProps) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}: <span className="font-bold text-violet-700">{value}</span>/5
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-violet-600"
      />
    </label>
  );
}
