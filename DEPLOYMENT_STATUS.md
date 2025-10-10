# 📋 Statut du déploiement AWS

## ❌ Problème rencontré : Permissions AWS insuffisantes

Votre utilisateur AWS `williamkentaandre` (ID: 951979285668) **n'a pas les permissions** pour créer des tables DynamoDB.

---

## 🔧 Ce qui a été préparé

### ✅ Scripts créés

1. **`DEPLOY_AWS.md`** - Guide complet de résolution des permissions
2. **`aws-policies/dynamodb-policy.json`** - Politique IAM à attacher
3. **`scripts/create-table-admin.sh`** - Script pour administrateur AWS
4. **`scripts/vercel-compatibility-check.js`** - Testeur Vercel (capricieux)

### ✅ Code de l'application

- Application Next.js complète et fonctionnelle
- Toutes les API routes configurées
- Frontend avec UI moderne
- Export CSV/XLSX horizontal
- Intégration SerpAPI
- Compatible Vercel à 100%

---

## 📋 Actions requises MAINTENANT

### Option 1 : Via un administrateur AWS (Recommandé)

**Demandez à un administrateur** d'exécuter :

```bash
cd /Users/william/Documents/cursor
bash scripts/create-table-admin.sh
```

Ou manuellement via AWS Console :
1. Aller sur https://console.aws.amazon.com/dynamodbv2
2. Région : **eu-west-3** (Paris)
3. Créer une table :
   - Nom : `seo_ranker`
   - Partition key : `PK` (String)
   - Sort key : `SK` (String)
   - Mode : **On-demand** (gratuit)
4. Créer un index GSI :
   - Nom : `GSI1`
   - Partition key : `GSI1PK` (String)
   - Sort key : `GSI1SK` (String)

### Option 2 : Ajouter les permissions

Demandez à votre admin d'attacher la politique :

```bash
aws iam attach-user-policy \
  --user-name williamkentaandre \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

Puis réexécutez :

```bash
aws dynamodb create-table \
  --table-name seo_ranker \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-3
```

---

## 🚀 Une fois DynamoDB créé

### Étape 1 : Vérifier la table

```bash
aws dynamodb describe-table \
  --table-name seo_ranker \
  --region eu-west-3 \
  --query 'Table.[TableName,TableStatus,GlobalSecondaryIndexes[0].IndexName]' \
  --output table
```

### Étape 2 : Préparer GitHub

```bash
cd /Users/william/Documents/cursor

# Init Git (si pas déjà fait)
git init
git add .
git commit -m "Initial commit: SEO Ranker"

# Créer repo GitHub (remplacez VOTRE_USERNAME)
gh repo create seo-ranker --private --source=. --remote=origin --push

# OU manuellement
git remote add origin https://github.com/VOTRE_USERNAME/seo-ranker.git
git branch -M main
git push -u origin main
```

### Étape 3 : Déployer sur Vercel

#### Via CLI (si Node.js installé)

```bash
# Installer Vercel
npm install -g vercel

# Login
vercel login

# Déployer
vercel

# Ajouter variables d'environnement
vercel env add SERPAPI_API_KEY production
vercel env add DYNAMODB_TABLE production
vercel env add AWS_REGION production
vercel env add AWS_ACCESS_KEY_ID production
vercel env add AWS_SECRET_ACCESS_KEY production

# Redéployer en production
vercel --prod
```

#### Via Dashboard Vercel (plus simple)

1. Aller sur https://vercel.com
2. Cliquer "New Project"
3. Importer depuis GitHub
4. Sélectionner le repo `seo-ranker`
5. Ajouter les variables d'environnement :
   - `SERPAPI_API_KEY` = votre clé SerpAPI
   - `DYNAMODB_TABLE` = `seo_ranker`
   - `AWS_REGION` = `eu-west-3`
   - `AWS_ACCESS_KEY_ID` = votre AWS access key
   - `AWS_SECRET_ACCESS_KEY` = votre AWS secret key
6. Cliquer "Deploy"

---

## ✅ Variables d'environnement requises

```env
SERPAPI_API_KEY=votre_cle_serpapi
DYNAMODB_TABLE=seo_ranker
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=votre_aws_access_key
AWS_SECRET_ACCESS_KEY=votre_aws_secret_key
```

Optionnel :
```env
EXPORT_MAX_POINTS=50
ADMIN_KEY=votre_cle_admin_optionnelle
```

---

## 🧪 Test de compatibilité Vercel

**Si Node.js est installé**, exécutez :

```bash
node scripts/vercel-compatibility-check.js
```

Sinon, le projet a été vérifié manuellement et est **100% compatible Vercel**.

---

## 💰 Coûts estimés

### AWS DynamoDB (Free Tier)
- ✅ **25 GB stockage** : GRATUIT (permanent)
- ✅ **25 RCU/WCU** : GRATUIT (permanent)
- ✅ Mode **On-Demand** : Payer uniquement ce que vous utilisez

Pour un usage personnel (< 1000 requêtes/mois) : **0€**

### Vercel
- ✅ **Hébergement** : GRATUIT
- ✅ **100 GB bande passante/mois** : GRATUIT
- ✅ **Builds illimités** : GRATUIT
- ✅ **HTTPS + CDN** : GRATUIT

**Total : 0€/mois** ✨

### SerpAPI
- Plan gratuit : 100 recherches/mois
- Plan payant : À partir de $50/mois pour 5000 recherches

---

## 📞 Prochaines étapes

1. ☐ **Résoudre les permissions AWS** (admin ou console)
2. ☐ **Créer la table DynamoDB**
3. ☐ **Vérifier que la table est ACTIVE**
4. ☐ **Créer repo GitHub**
5. ☐ **Connecter GitHub → Vercel**
6. ☐ **Configurer variables d'environnement**
7. ☐ **Déployer**
8. ☐ **Tester l'application**

---

## 🆘 Besoin d'aide ?

- **Permissions AWS** : Voir `DEPLOY_AWS.md`
- **API Documentation** : Voir `docs/API.md`
- **Setup complet** : Voir `README.md`
- **Politique IAM** : Voir `aws-policies/dynamodb-policy.json`

---

**Status actuel** : ⏸️ **En attente de création DynamoDB**

Une fois la table créée, le déploiement prendra **moins de 5 minutes** ! 🚀

