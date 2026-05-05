import adviceData from "@/data/advice.json";
import { SectionCard } from "@/components/SectionCard";
import { DailyTrackingData, OnboardingData } from "@/utils/types";

interface AdviceViewProps {
  profile: OnboardingData;
  tracking: DailyTrackingData;
}

const tips = adviceData as {
  id: string;
  titre: string;
  description: string;
  categorie: string;
}[];

export function AdviceView({ profile, tracking }: AdviceViewProps) {
  const dynamicAdvice = buildDynamicAdvice(profile, tracking);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Conseils personnalisés"
        subtitle="Ces conseils sont générés à partir de ton objectif et de ton suivi."
      >
        <ul className="space-y-2">
          {dynamicAdvice.map((item) => (
            <li key={item} className="rounded-xl bg-violet-50 p-3 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Conseils experts SOPK">
        <div className="space-y-2">
          {tips.map((tip) => (
            <article key={tip.id} className="rounded-xl border border-slate-200 p-3">
              <h3 className="font-semibold text-slate-900">{tip.titre}</h3>
              <p className="mt-1 text-sm text-slate-700">{tip.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function buildDynamicAdvice(profile: OnboardingData, tracking: DailyTrackingData): string[] {
  const advice: string[] = [];

  if (tracking.fringales >= 4) {
    advice.push("Ajoute une source de protéines au petit déjeuner pour réduire les fringales de l’après-midi.");
  }
  if (tracking.energie <= 2) {
    advice.push("Vise un déjeuner avec plus de légumes et moins de sucres rapides pour limiter le coup de fatigue.");
  }
  if (tracking.sommeilHeures < 7) {
    advice.push("Essaie une routine de coucher fixe: même heure chaque soir pendant 7 jours.");
  }
  if (!tracking.repasSuivis) {
    advice.push("Prépare ta collation à l’avance pour éviter les choix impulsifs.");
  }
  if (profile.objectifPrincipal === "perte_poids") {
    advice.push("Priorise 8 000 pas par jour et une assiette riche en fibres à chaque repas.");
  }
  if (profile.objectifPrincipal === "reduction_fringales") {
    advice.push("Intègre une collation planifiée riche en protéines vers 16h.");
  }
  if (advice.length === 0) {
    advice.push("Continue tes habitudes actuelles: ton suivi quotidien est cohérent.");
  }

  return advice;
}
