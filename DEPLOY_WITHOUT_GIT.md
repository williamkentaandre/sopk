# 🚀 Déploiement rapide sur Vercel (SANS Git)

## Situation
- Table DynamoDB créée via console ✅
- Git non installé sur votre Mac ❌
- **Solution** : Déploiement direct via Vercel CLI

---

## 📦 Méthode 1 : Via Vercel CLI (si Node.js installé)

### Étape 1 : Installer Vercel CLI

```bash
# Si npm disponible
npm install -g vercel

# OU via Homebrew
brew install vercel-cli
```

### Étape 2 : Déployer

```bash
cd /Users/william/Documents/cursor

# Login (ouvre le navigateur)
vercel login

# Déployer
vercel
```

Répondez aux questions :
- Project name : `seo-ranker`
- Deploy : `Y`

### Étape 3 : Configurer variables d'environnement

Via le dashboard Vercel ou en CLI :

```bash
vercel env add SERPAPI_API_KEY production
# Entrer votre clé SerpAPI

vercel env add DYNAMODB_TABLE production
# Entrer: seo_ranker

vercel env add AWS_REGION production
# Entrer la région où est la table (ex: eu-west-3)

vercel env add AWS_ACCESS_KEY_ID production
# Entrer votre AWS Access Key

vercel env add AWS_SECRET_ACCESS_KEY production
# Entrer votre AWS Secret Key
```

### Étape 4 : Redéployer avec les variables

```bash
vercel --prod
```

---

## 🌐 Méthode 2 : Via Dashboard Vercel (PLUS SIMPLE)

### Étape 1 : Créer une archive ZIP

```bash
cd /Users/william/Documents/cursor

# Créer un ZIP (exclure node_modules et .next)
zip -r seo-ranker.zip . -x "node_modules/*" ".next/*" ".git/*"
```

### Étape 2 : Upload sur GitHub (sans Git)

1. Aller sur https://github.com/new
2. Nom : `seo-ranker`
3. Visibilité : Private
4. **NE PAS** initialiser avec README
5. Créer le repository
6. Sur la page du repo → "**uploading an existing file**"
7. Glisser-déposer tous les fichiers du projet (SAUF node_modules, .next, .env)

### Étape 3 : Connecter à Vercel

1. https://vercel.com → Login avec GitHub
2. "New Project"
3. Import `seo-ranker`
4. **Ajouter les variables d'environnement** :
   - `SERPAPI_API_KEY` = [votre clé]
   - `DYNAMODB_TABLE` = `seo_ranker`
   - `AWS_REGION` = [la région de votre table]
   - `AWS_ACCESS_KEY_ID` = [votre key]
   - `AWS_SECRET_ACCESS_KEY` = [votre secret]
5. Deploy !

---

## 🎯 Méthode 3 : GitHub Desktop (recommandé pour débutants)

### Étape 1 : Installer GitHub Desktop

1. Télécharger : https://desktop.github.com
2. Installer et ouvrir
3. Login avec votre compte GitHub

### Étape 2 : Créer le repository

1. File → New Repository
2. Name : `seo-ranker`
3. Local Path : `/Users/william/Documents`
4. "Create Repository"
5. "Publish repository" → Private : ✓

### Étape 3 : Ajouter les fichiers

1. GitHub Desktop détecte automatiquement les fichiers
2. Summary : "Initial commit"
3. "Commit to main"
4. "Push origin"

### Étape 4 : Connecter Vercel

(Même que Méthode 2, Étape 3)

---

## ✅ Variables d'environnement nécessaires

```
SERPAPI_API_KEY=votre_cle_serpapi_ici
DYNAMODB_TABLE=seo_ranker
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

**Où trouver ces valeurs ?**

1. **SERPAPI_API_KEY** : https://serpapi.com/manage-api-key
2. **DYNAMODB_TABLE** : `seo_ranker` (le nom de votre table)
3. **AWS_REGION** : Visible dans la console DynamoDB (en haut à droite)
4. **AWS_ACCESS_KEY_ID** / **SECRET** : 
   - Console AWS → IAM → Users → williamkentaandre → Security credentials
   - Ou créer une nouvelle : "Create access key"

---

## 🧪 Tester après déploiement

```bash
# Remplacer par votre URL Vercel
curl https://seo-ranker-xxxxx.vercel.app/api/v1/health

# Devrait retourner :
{
  "ok": true,
  "serpapi": "reachable",
  "timestamp": "..."
}
```

Si erreur DynamoDB → vérifier les credentials et la région.

---

## 🆘 Problèmes courants

### "Cannot find module 'next'"
→ Vercel installe automatiquement, pas de souci

### "DynamoDB Access Denied"
→ Vérifier :
- Les credentials AWS dans les variables d'environnement
- La région correspond à celle de la table
- L'utilisateur a les permissions (au moins Query/Scan/PutItem)

### "SerpAPI error"
→ Vérifier la clé API sur https://serpapi.com

---

**Quelle méthode préférez-vous ?**

1. Vercel CLI (rapide, nécessite npm)
2. Upload manuel GitHub + Vercel (sans outils)
3. GitHub Desktop (le plus simple avec UI)

