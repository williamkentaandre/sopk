import { CapacitorNavLink } from "@/components/CapacitorNavLink";
import { LegalBackHeader } from "@/components/LegalBackHeader";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <LegalBackHeader />
      <section className="mx-auto w-full max-w-4xl px-5 pb-8 pt-6 md:px-8 md:pb-12 md:pt-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            Assistance officielle
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Support - Régime SOPK
          </h1>
          <p className="mt-3 text-slate-700">
            Cette page fournit les informations de support de l&apos;application Régime SOPK. Elle
            est affichée sur la fiche App Store.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoCard title="Email support">
              <a className="font-semibold text-violet-700" href="mailto:support@regimesopk.com">
                support@regimesopk.com
              </a>
            </InfoCard>
            <InfoCard title="Délai de réponse">
              Nous répondons en général sous 24 à 72 heures ouvrées.
            </InfoCard>
            <InfoCard title="Langues supportées">Français</InfoCard>
            <InfoCard title="Plateforme">iPhone (iOS)</InfoCard>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-8 md:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <h2 className="text-2xl font-bold">FAQ rapide</h2>
          <div className="mt-5 space-y-4">
            <FaqItem
              question="Je n&apos;arrive pas à me connecter"
              answer="Vérifiez votre connexion internet et relancez l&apos;application. Si le problème persiste, contactez-nous par email."
            />
            <FaqItem
              question="Mes données ne semblent pas à jour"
              answer="Fermez puis rouvrez l&apos;application. Si nécessaire, utilisez la réinitialisation dans les réglages du programme."
            />
            <FaqItem
              question="Comment supprimer mes données"
              answer="Vous pouvez supprimer vos données depuis l&apos;application en réinitialisant le programme, ou nous écrire à support@regimesopk.com."
            />
            <FaqItem
              question="L&apos;application donne-t-elle un avis médical"
              answer="Non. Régime SOPK propose un accompagnement nutritionnel et de suivi bien-être. Cela ne remplace pas un professionnel de santé."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-14 md:px-8 md:pb-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <h2 className="text-2xl font-bold">Liens utiles</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
            <li>
              Politique de confidentialité :{" "}
              <CapacitorNavLink className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-violet-700 underline" href="/privacy/">
                regimesopk.com/privacy
              </CapacitorNavLink>
            </li>
            <li>
              Site principal :{" "}
              <CapacitorNavLink className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-violet-700 underline" href="/">
                regimesopk.com
              </CapacitorNavLink>
            </li>
          </ul>
        </div>
        <footer className="mt-6 text-center text-xs text-slate-500">
          © 2026 Régime SOPK. Tous droits réservés.
        </footer>
      </section>
    </main>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-700">{children}</p>
    </article>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900 md:text-base">{question}</h3>
      <p className="mt-1 text-sm text-slate-700">{answer}</p>
    </article>
  );
}
