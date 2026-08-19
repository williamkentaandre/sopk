"use client";

import { LegalBackHeader } from "@/components/LegalBackHeader";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <LegalBackHeader />
      <section className="mx-auto w-full max-w-4xl px-5 pb-8 pt-6 md:px-8 md:pb-12 md:pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Politique de confidentialité - SOPK Nutrition
          </h1>
          <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 7 mai 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 md:text-base">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1) Données collectées</h2>
              <p className="mt-2">
                L&apos;application peut stocker localement sur votre appareil des informations liées
                à votre utilisation : profil (âge, taille, poids), progression quotidienne (repas,
                hydratation, pas) et préférences de programme.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">2) Finalité</h2>
              <p className="mt-2">
                Ces données servent uniquement à personnaliser l&apos;expérience, afficher vos
                objectifs et suivre votre progression dans le programme nutritionnel.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">3) Stockage et sécurité</h2>
              <p className="mt-2">
                Les données sont principalement stockées localement sur votre appareil. Nous ne
                vendons pas vos données personnelles.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">4) Partage des données</h2>
              <p className="mt-2">
                Nous ne partageons pas vos données personnelles avec des tiers à des fins
                commerciales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">5) Vos droits</h2>
              <p className="mt-2">
                Vous pouvez à tout moment supprimer vos données en réinitialisant l&apos;application
                ou en nous contactant.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">6) Contact</h2>
              <p className="mt-2">
                Pour toute question liée à la confidentialité, contactez-nous :
                <a className="ml-1 font-semibold text-violet-700" href="mailto:support@regimesopk.com">
                  support@regimesopk.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">7) Information importante</h2>
              <p className="mt-2">
                SOPK Nutrition ne remplace pas un avis médical. L&apos;application fournit des
                recommandations de bien-être et de nutrition générale.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
