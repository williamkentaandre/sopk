"use client";

import { SectionCard } from "@/components/SectionCard";

interface HydrationViewProps {
  currentMl: number;
  targetMl: number;
  onAdd: (ml: number) => void;
  onReset: () => void;
}

const quickAdds = [200, 300, 500];

export function HydrationView({ currentMl, targetMl, onAdd, onReset }: HydrationViewProps) {
  const progress = Math.min(100, Math.round((currentMl / targetMl) * 100));

  return (
    <div className="space-y-4">
      <SectionCard title="Hydratation quotidienne" subtitle="Objectif: 2.0 à 2.5 L par jour">
        <div className="rounded-xl bg-violet-50 p-3">
          <div className="flex items-end justify-between">
            <p className="text-sm text-violet-700">Progression</p>
            <p className="text-2xl font-bold text-violet-800">{progress}%</p>
          </div>
          <div className="mt-2 h-3 w-full rounded-full bg-violet-200">
            <div className="h-3 rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {currentMl} ml / {targetMl} ml
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {quickAdds.map((amount) => (
            <button
              key={amount}
              onClick={() => onAdd(amount)}
              className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              type="button"
            >
              +{amount} ml
            </button>
          ))}
        </div>

        <button
          onClick={onReset}
          className="w-full rounded-xl border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          type="button"
        >
          Réinitialiser aujourd’hui
        </button>
      </SectionCard>

      <SectionCard title="Rappels pratiques">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Bois un verre d’eau dès le réveil.</li>
          <li>Ajoute une gourde visible sur ton bureau.</li>
          <li>Associe l’eau à chaque repas et collation.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
