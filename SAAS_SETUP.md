# Configuration SaaS SEO Ranker

## 1. Variables d'environnement

Copiez `.env.example` vers `.env` et renseignez :

- **DATABASE_URL** : SQLite en dev : `file:./prisma/dev.db`. En production (ex. Vercel) : URL PostgreSQL (Neon, Vercel Postgres, etc.).
- **NEXTAUTH_SECRET** : Chaîne aléatoire longue (ex. `openssl rand -base64 32`).
- **NEXTAUTH_URL** : En dev `http://localhost:3000`, en prod l’URL de votre app (ex. `https://votredomaine.com`).
- **STRIPE_SECRET_KEY** : Clé secrète Stripe (Dashboard Stripe → Developers → API keys).
- **STRIPE_WEBHOOK_SECRET** : Secret du webhook (Stripe CLI ou Dashboard → Webhooks).
- **STRIPE_PRICE_ID** : ID du prix du paiement unique (Dashboard → Products → créer un produit → prix one-time → copier l’ID `price_xxx`).

## 2. Base de données

```bash
npm install
npx prisma db push
```

(Pour des migrations versionnées : `npx prisma migrate dev`.)

## 3. Webhook Stripe

- URL du webhook : `https://votredomaine.com/api/webhooks/stripe`
- Événement à écouter : `checkout.session.completed`

En local avec Stripe CLI :  
`stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## 4. Parcours utilisateur

1. Inscription → création du compte (`stripe_payment_status = pending`).
2. Connexion → redirection vers « Paiement requis » si non payé.
3. Clic sur « Payer » → Stripe Checkout (paiement unique).
4. Après paiement → redirection vers `/login?payment=success` → se reconnecter pour rafraîchir le statut.
5. Paramètres → saisie de la clé SERP API personnelle.
6. Dashboard → utilisation de l’app avec sa propre clé SERP.

## 5. Routes

- **Publiques** : `/`, `/login`, `/signup`
- **Protégées (connecté + payé)** : `/dashboard`, `/settings`
- **API** : `/api/v1/*` et `/api/stripe/create-checkout` exigent un utilisateur connecté (et payé pour `/api/v1/*`).  
  `/api/auth/*` et `/api/webhooks/stripe` sont publics (auth ou webhook).
