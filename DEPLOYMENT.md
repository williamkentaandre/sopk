# Déploiement SEO Ranker (Vercel + PostgreSQL)

Le schéma Prisma utilise **PostgreSQL** (obligatoire pour Vercel). En local, utilise aussi une base Postgres (ex. Neon gratuite).

## 1. Base de données PostgreSQL

Vercel ne supporte pas SQLite. Utilise une base PostgreSQL gratuite :

### Option A : Neon (recommandé)

1. Va sur **https://neon.tech** et crée un compte.
2. Crée un projet → récupère l’**URL de connexion** (Connection string), ex. :
   `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. Garde cette URL pour l’étape suivante.

### Option B : Vercel Postgres ou Supabase

- **Vercel** : Dashboard Vercel → Storage → Create Database → Postgres.
- **Supabase** : https://supabase.com → New Project → Settings → Database → Connection string (URI).

---

## 2. Créer les tables en production

Une seule fois, avec l’URL de ta base **production** :

```bash
cd /Users/william/Documents/cursor
DATABASE_URL="postgresql://..." npx prisma db push
```

(Remplace `postgresql://...` par ta vraie URL Neon/Vercel/Supabase.)

Pour le **développement local** : mets la même URL (ou une deuxième base Neon) dans ton fichier **`.env`** comme `DATABASE_URL`, puis `npx prisma db push` une fois. Ensuite `npm run dev` utilisera cette base.

---

## 3. Déployer sur Vercel

### Via le site Vercel

1. Va sur **https://vercel.com** et connecte-toi (GitHub/GitLab/Bitbucket).
2. **Add New** → **Project** → importe ton repo (ou uploade le projet).
3. Avant de déployer, configure les **Environment Variables** :

| Variable | Valeur | Environnement |
|----------|--------|----------------|
| `DATABASE_URL` | Ton URL PostgreSQL (Neon, etc.) | Production (et Preview si tu veux) |
| `NEXTAUTH_SECRET` | Chaîne aléatoire longue (ex. `openssl rand -base64 32`) | Production |
| `NEXTAUTH_URL` | URL de l’app (ex. `https://ton-projet.vercel.app`) | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` ou `sk_live_...` | Production |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook **production** (voir ci‑dessous) | Production |
| `STRIPE_PRICE_ID` | `price_...` | Production |

4. Déploie (Deploy).

### Via la CLI Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Puis ajoute les variables dans le dashboard Vercel (Settings → Environment Variables).

---

## 4. Webhook Stripe en production

1. Dashboard **Stripe** → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL** : `https://ton-projet.vercel.app/api/webhooks/stripe`
3. **Events** : sélectionne `checkout.session.completed`.
4. Crée l’endpoint → clique sur l’endpoint → **Reveal** pour le **Signing secret** (`whsec_...`).
5. Copie ce secret et ajoute‑le dans Vercel comme **`STRIPE_WEBHOOK_SECRET`** (pour Production).  
   ⚠️ Ce n’est **pas** le même que celui de `stripe listen` en local.

---

## 5. Après le premier déploiement

1. Ouvre l’URL de l’app (ex. `https://ton-projet.vercel.app`).
2. Crée un compte, paie (mode test ou live selon ta clé Stripe), reconnecte‑toi.
3. Va dans Paramètres et ajoute ta clé SerpAPI.

---

## Résumé des URLs

- **App** : `https://ton-projet.vercel.app`
- **Webhook Stripe** : `https://ton-projet.vercel.app/api/webhooks/stripe`
- **NEXTAUTH_URL** doit être exactement l’URL de l’app (sans slash final).
