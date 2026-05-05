# NutriSOPK (Next.js + Tailwind + localStorage + Capacitor)

Application mobile-first SOPK avec:

- onboarding complet
- plan alimentaire réaliste sur 7 jours
- suivi quotidien
- conseils personnalisés
- suivi hydratation
- PWA installable
- configuration Capacitor iOS prête

## 1) Commandes exactes de création

```bash
npx create-next-app@latest sopk-mobile-first --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd sopk-mobile-first
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init NutriSOPK com.nutrisopk.app --web-dir=out
npx cap add ios
```

## 2) Lancer l'application web

```bash
npm run dev
```

Ouvre `http://localhost:3000`.

## 3) Build web + copie Capacitor

```bash
npm run build:web
npx cap copy
```

## 4) Ouvrir iOS (Xcode)

```bash
npx cap open ios
```

## 5) Structure du projet

```text
src/
  app/
  components/
  data/
  hooks/
  utils/
public/
  icons/
  sw.js
capacitor.config.ts
```
