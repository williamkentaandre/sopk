# Checklist mise en production – SEO Ranker

Tu as déjà Neon et Stripe. Suis ces étapes dans l’ordre.

---

## 1. Code sur GitHub (ou autre)

Si ce n’est pas déjà fait :

```bash
cd /Users/william/Documents/cursor
git add .
git commit -m "Ready for production"
git remote add origin https://github.com/TON-USERNAME/TON-REPO.git   # ou ton URL
git push -u origin main
```

(Crée le repo sur GitHub avant le `git push`.)

---

## 2. Vercel – créer le projet

1. Va sur **https://vercel.com** → connecte-toi (avec GitHub si possible).
2. **Add New** → **Project**.
3. Importe le repo **cursor** (ou le nom du repo).
4. **Ne déploie pas tout de suite** : clique sur **Environment Variables** pour tout remplir avant.

---

## 3. Variables d’environnement Vercel

Dans **Settings** → **Environment Variables** du projet, ajoute (pour **Production**) :

| Name | Value |
|------|--------|
| `DATABASE_URL` | Ta même URL Neon (celle dans ton `.env` actuel) |
| `NEXTAUTH_SECRET` | Une nouvelle chaîne aléatoire longue (ex. génère avec `openssl rand -base64 32` dans un terminal) |
| `NEXTAUTH_URL` | **À remplir après le 1er déploiement** : `https://ton-projet.vercel.app` (remplace par l’URL réelle donnée par Vercel) |
| `STRIPE_SECRET_KEY` | Ta clé Stripe (la même qu’en local : `sk_test_...` ou `sk_live_...` pour le vrai paiement) |
| `STRIPE_WEBHOOK_SECRET` | **À remplir après l’étape 4** (secret du webhook **production**) |
| `STRIPE_PRICE_ID` | Ton Price ID (ex. `price_1T9UjPP9U211U7kmxvLIMZYY`) |

- Pour `NEXTAUTH_URL` et `STRIPE_WEBHOOK_SECRET`, tu peux faire un **premier déploiement**, noter l’URL du projet, puis les ajouter et **redéployer** (Redeploy).

---

## 4. Premier déploiement

1. Déploie le projet (Deploy).
2. Note l’URL affichée, ex. **`https://seo-ranker-xxx.vercel.app`**.

---

## 5. Webhook Stripe production

1. **Stripe** → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL** : `https://TON-URL-VERCEL.vercel.app/api/webhooks/stripe` (remplace par ton URL).
3. **Events to send** : choisis **`checkout.session.completed`**.
4. **Add endpoint** → ouvre l’endpoint → **Reveal** le **Signing secret** (`whsec_...`).
5. Copie ce secret.
6. Dans **Vercel** → ton projet → **Settings** → **Environment Variables** : ajoute (ou modifie) **`STRIPE_WEBHOOK_SECRET`** avec ce `whsec_...`.
7. **Redeploy** le projet (Deployments → ⋮ sur le dernier → Redeploy).

---

## 6. NEXTAUTH_URL

1. Dans Vercel → **Settings** → **Environment Variables**.
2. Ajoute ou modifie **`NEXTAUTH_URL`** = ton URL de prod (ex. `https://seo-ranker-xxx.vercel.app`), **sans slash final**.
3. **Redeploy** une dernière fois.

---

## 7. Vérification

1. Ouvre l’URL de prod.
2. Crée un compte (ou connecte-toi).
3. Passe par « Paiement requis » → paie en test (carte `4242...`).
4. Après redirection et reconnexion, tu dois avoir accès au dashboard.
5. Paramètres → ajoute ta clé SerpAPI.

---

## Résumé

- **Base** : même Neon qu’en local (ou une deuxième base Neon dédiée prod).
- **Stripe** : même clé et même Price ID ; **obligatoire** : un webhook **production** avec l’URL Vercel et son **Signing secret** dans `STRIPE_WEBHOOK_SECRET`.
- **NEXTAUTH_URL** = URL exacte de l’app en prod.
