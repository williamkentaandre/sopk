"use client";

import { LegalBackHeader } from "@/components/LegalBackHeader";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <LegalBackHeader />
      <section className="mx-auto w-full max-w-4xl px-5 pb-8 pt-6 md:px-8 md:pb-12 md:pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Conditions d&apos;utilisation - SOPK Nutrition
          </h1>
          <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 17 juin 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 md:text-base">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1) Objet</h2>
              <p className="mt-2">
                SOPK Nutrition propose un accompagnement nutritionnel et un suivi de bien-être. L&apos;application
                ne remplace pas un avis médical, un diagnostic ou un traitement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">2) Abonnements à renouvellement automatique</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong>Abonnement mensuel</strong> - durée&nbsp;: 1&nbsp;mois, renouvelé automatiquement chaque
                  mois jusqu&apos;à résiliation.
                </li>
                <li>
                  <strong>Abonnement annuel</strong> - durée&nbsp;: 1&nbsp;an, renouvelé automatiquement chaque
                  année jusqu&apos;à résiliation.
                </li>
                <li>
                  Un essai gratuit de 7&nbsp;jours peut être proposé aux nouveaux abonnés éligibles. À l&apos;issue
                  de l&apos;essai, le tarif affiché dans l&apos;App Store est facturé via votre compte Apple.
                </li>
                <li>
                  Le paiement est débité sur votre compte Apple à la confirmation de l&apos;achat. Le renouvellement
                  est facturé dans les 24&nbsp;heures précédant la fin de la période en cours.
                </li>
                <li>
                  Vous pouvez gérer ou annuler votre abonnement à tout moment dans Réglages → [votre nom] →
                  Abonnements sur votre appareil Apple.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">3) Utilisation acceptable</h2>
              <p className="mt-2">
                Vous vous engagez à utiliser l&apos;application de manière personnelle et conforme aux lois
                applicables. Toute tentative de contournement des mécanismes de paiement ou d&apos;accès est
                interdite.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">4) Propriété intellectuelle</h2>
              <p className="mt-2">
                Les contenus, marques et éléments graphiques de SOPK Nutrition restent la propriété de leurs
                titulaires. Aucune licence de reproduction n&apos;est accordée au-delà de l&apos;usage prévu par
                l&apos;application.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">5) Limitation de responsabilité</h2>
              <p className="mt-2">
                L&apos;application est fournie «&nbsp;en l&apos;état&nbsp;». Les recommandations nutritionnelles
                sont indicatives ; consultez un professionnel de santé pour toute décision médicale.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">6) Contact</h2>
              <p className="mt-2">
                Questions relatives à ces conditions&nbsp;:
                <a className="ml-1 font-semibold text-violet-700" href="mailto:support@regimesopk.com">
                  support@regimesopk.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
