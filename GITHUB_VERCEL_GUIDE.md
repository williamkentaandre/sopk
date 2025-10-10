# 🔗 Guide : Connecter GitHub avec Vercel

## Préambule

Une fois que **DynamoDB est créé sur AWS**, suivez ce guide pour déployer sur Vercel.

---

## 📚 Étape 1 : Créer le repository GitHub

### Option A : Via GitHub CLI (recommandé)

```bash
cd /Users/william/Documents/cursor

# Initialiser Git
git init
git add .
git commit -m "Initial commit: SEO Ranker application"

# Créer repo GitHub (privé)
gh repo create seo-ranker --private --source=. --remote=origin

# Pousser le code
git push -u origin main
```

### Option B : Via GitHub Web

1. Aller sur https://github.com/new
2. Nom du repository : `seo-ranker`
3. Visibilité : **Private** (recommandé)
4. **NE PAS** initialiser avec README/gitignore (déjà présents)
5. Cliquer "Create repository"
6. Suivre les instructions "push an existing repository" :

```bash
cd /Users/william/Documents/cursor

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/seo-ranker.git
git push -u origin main
```

---

## 🚀 Étape 2 : Connecter GitHub avec Vercel

### OUI, je sais connecter GitHub avec Vercel ! Voici comment :

### Option A : Via Dashboard Vercel (PLUS SIMPLE)

#### 1. Créer un compte Vercel

- Aller sur https://vercel.com/signup
- Choisir "**Continue with GitHub**"
- Autoriser Vercel à accéder à GitHub

#### 2. Importer le projet

- Cliquer sur "**Add New...**" → "**Project**"
- Vercel affiche vos repos GitHub
- Cliquer "**Import**" sur `seo-ranker`

#### 3. Configurer le projet

Vercel détecte automatiquement Next.js :
- Framework Preset : **Next.js** ✅
- Root Directory : `./` (par défaut)
- Build Command : `npm run build` (auto-détecté)
- Output Directory : `.next` (auto-détecté)

#### 4. Ajouter les variables d'environnement

**IMPORTANT** : Cliquer sur "**Environment Variables**"

Ajouter une par une :

| Key | Value | Environment |
|-----|-------|-------------|
| `SERPAPI_API_KEY` | votre_cle_serpapi | Production |
| `DYNAMODB_TABLE` | `seo_ranker` | Production |
| `AWS_REGION` | `eu-west-3` | Production |
| `AWS_ACCESS_KEY_ID` | votre_aws_key | Production |
| `AWS_SECRET_ACCESS_KEY` | votre_aws_secret | Production |

Optionnel :
| Key | Value | Environment |
|-----|-------|-------------|
| `EXPORT_MAX_POINTS` | `50` | Production |

#### 5. Déployer

- Cliquer "**Deploy**"
- Attendre 2-3 minutes ☕
- Votre app sera sur : `https://seo-ranker-xxxxx.vercel.app`

---

### Option B : Via Vercel CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter (ouvre le navigateur pour GitHub OAuth)
vercel login

# Lier le projet
cd /Users/william/Documents/cursor
vercel link

# Ajouter les variables d'environnement
vercel env add SERPAPI_API_KEY production
# Entrer la valeur quand demandé

vercel env add DYNAMODB_TABLE production
# Entrer: seo_ranker

vercel env add AWS_REGION production
# Entrer: eu-west-3

vercel env add AWS_ACCESS_KEY_ID production
# Entrer votre AWS Access Key

vercel env add AWS_SECRET_ACCESS_KEY production
# Entrer votre AWS Secret Key

# Déployer en production
vercel --prod
```

---

## ✅ Vérifier que tout fonctionne

### 1. Accéder à l'application

Vercel vous donne une URL : `https://seo-ranker-xxxxx.vercel.app`

### 2. Tester l'API Health

```bash
curl https://seo-ranker-xxxxx.vercel.app/api/v1/health
```

Réponse attendue :
```json
{
  "ok": true,
  "serpapi": "reachable",
  "timestamp": "2025-10-10T..."
}
```

### 3. Tester l'UI

1. Ouvrir l'URL dans le navigateur
2. Configurer `hl` et `gl` (ex: fr, fr)
3. Ajouter un couple mot-clé/URL
4. Cliquer sur "▶" pour mesurer
5. Exporter en CSV

---

## 🔄 CI/CD Automatique

**Bonus** : Une fois connecté, chaque `git push` redéploie automatiquement !

```bash
# Faire une modification
vim app/page.tsx

# Commit et push
git add .
git commit -m "Update UI"
git push origin main

# Vercel redéploie automatiquement! 🚀
```

---

## 🎛️ Configuration avancée (optionnel)

### Domaine personnalisé

1. Dashboard Vercel → Projet → "**Settings**"
2. "**Domains**"
3. Ajouter votre domaine
4. Suivre les instructions DNS

### Variables par environnement

Vercel permet 3 environnements :
- **Production** : `vercel --prod`
- **Preview** : Chaque push sur une branche
- **Development** : Local avec `vercel dev`

### Logs en temps réel

Dashboard Vercel → Projet → "**Deployments**" → Cliquer sur un déploiement

---

## 🔐 Sécurité

### Variables sensibles

- ✅ Les variables d'environnement sont **chiffrées**
- ✅ Jamais exposées dans les logs
- ✅ Accessibles uniquement par les functions serverless

### .gitignore

Vérifiez que `.env` est bien ignoré :

```bash
cat .gitignore | grep .env
```

**Ne JAMAIS commit** `.env` avec vos clés !

---

## 🐛 Dépannage

### Erreur "Build failed"

1. Vérifier les logs dans Vercel Dashboard
2. Tester localement :
```bash
npm install
npm run build
```

### Erreur "DynamoDB Access Denied"

- Vérifier les credentials AWS dans les variables d'environnement
- Vérifier que la table existe : 
```bash
aws dynamodb describe-table --table-name seo_ranker --region eu-west-3
```

### Erreur "SerpAPI unavailable"

- Vérifier la clé API sur https://serpapi.com/manage-api-key
- Vérifier les quotas

---

## 📊 Dashboard Vercel

### Informations disponibles

- **Analytics** : Trafic, performances
- **Logs** : Logs en temps réel des functions
- **Deployments** : Historique des déploiements
- **Settings** : Configuration, variables, domaines

### URL utiles

- Dashboard : https://vercel.com/dashboard
- Documentation : https://vercel.com/docs
- Support : https://vercel.com/support

---

## 🎉 Félicitations !

Votre application SEO Ranker est maintenant :

- ✅ Hébergée sur Vercel (gratuit)
- ✅ Connectée à DynamoDB
- ✅ Déployée automatiquement via Git
- ✅ Accessible mondialement via CDN
- ✅ Sécurisée avec HTTPS

**Prochaines étapes** :

1. Tester l'application
2. Ajouter vos premiers mots-clés
3. Mesurer les positions
4. Exporter les résultats

---

## 📞 Besoin d'aide ?

- Documentation API : `docs/API.md`
- README complet : `README.md`
- Statut déploiement : `DEPLOYMENT_STATUS.md`

**Bonne utilisation ! 🚀**

