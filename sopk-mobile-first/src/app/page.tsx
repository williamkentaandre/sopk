import { BrandLogo } from "@/components/BrandLogo";
import { CapacitorNavLink } from "@/components/CapacitorNavLink";

export default function Home() {
  return (
    <main className="app-shell-bg min-h-screen text-ink">
      <section className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <div className="rounded-3xl border border-brand-200 bg-white/95 p-6 shadow-card md:p-10">
          <div className="text-center">
            <p className="text-eyebrow inline-flex rounded-full bg-brand-100 px-3 py-1 text-brand-700">
              Nutrition hormonale
            </p>
            <BrandLogo variant="hero" className="mt-5" />
          </div>
          <h1
            className="sr-only"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            Régime SOPK - application nutritionnelle et suivi
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-slate-700 md:text-xl">
            Une nutrition adaptée à votre profil hormonal. Pour les femmes qui ont essayé tous les
            régimes, mais qui continuent à stocker du poids.
          </p>
          <div
            className="mt-6 flex flex-wrap justify-center gap-3"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}
          >
            <CapacitorNavLink
              href="/plan/"
              className="btn-brand rounded-xl px-5 py-3 text-sm"
            >
              Découvrir l&apos;application
            </CapacitorNavLink>
            <CapacitorNavLink
              href="/support/"
              className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Support
            </CapacitorNavLink>
          </div>
          <div className="mt-8 grid gap-3 text-base font-semibold leading-snug text-ink-muted sm:grid-cols-3 md:text-lg">
            <p className="rounded-xl bg-accent-soft px-4 py-3.5 text-accent">Hydratation</p>
            <p className="rounded-xl bg-brand-50 px-4 py-3.5 text-brand-800">Nutrition</p>
            <p className="rounded-xl bg-emerald-50 px-4 py-3.5 text-emerald-800">Suivi</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-8 md:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <h2 className="text-2xl font-bold md:text-3xl">Le problème</h2>
          <p className="mt-3 text-slate-700">
            Des années de frustration avec le poids. Beaucoup de femmes vivent des années de
            frustration malgré leurs efforts. Le poids revient souvent, et les régimes semblent
            tous inefficaces.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Card title="Jeûnes intermittents">
              Des restrictions qui épuisent sans résultats durables.
            </Card>
            <Card title="Régimes faibles en calories">
              Le métabolisme ralentit et le poids revient.
            </Card>
            <Card title="Activité physique intense">
              Des efforts intenses mais sans effets visibles.
            </Card>
            <Card title="Régimes low-carb ou keto">
              Difficiles à maintenir et frustrants à long terme.
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-8 md:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <h2 className="text-2xl font-bold md:text-3xl">Comment ça marche</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Card title="Plan nutritionnel personnalisé">
              Adapté à votre profil hormonal unique.
            </Card>
            <Card title="Suivi eau et macronutriments">
              Protéines &gt; glucides, gestion des lipides.
            </Card>
            <Card title="Recettes et conseils pratiques">
              Pour remplacer les sucres au quotidien.
            </Card>
            <Card title="Graphiques de progression">
              Visualisez vos résultats concrètement.
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-14 md:px-8 md:pb-20">
        <div className="rounded-3xl bg-slate-950 p-7 text-white md:p-10">
          <p className="text-sm font-semibold text-violet-300">Rejoignez-nous</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">
            Prenez votre poids en main, avec sérénité
          </h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Rejoignez les femmes qui ont enfin trouvé une approche qui respecte leur corps et leur
            profil hormonal.
          </p>
          <div
            className="mt-6 flex flex-wrap gap-3"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}
          >
            <CapacitorNavLink
              href="/plan/"
              className="inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Essayer l&apos;application
            </CapacitorNavLink>
            <CapacitorNavLink
              href="/privacy/"
              className="inline-flex rounded-xl border border-violet-300 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-white/10"
            >
              Politique de confidentialité
            </CapacitorNavLink>
            <CapacitorNavLink
              href="/terms/"
              className="inline-flex rounded-xl border border-violet-300 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-white/10"
            >
              Conditions d&apos;utilisation
            </CapacitorNavLink>
          </div>
        </div>
        <footer className="mt-6 text-center text-xs text-slate-500">
          © 2026 Régime SOPK. Tous droits réservés.
        </footer>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900 md:text-base">{title}</h3>
      <p className="mt-1 text-sm text-slate-700">{children}</p>
    </article>
  );
}
