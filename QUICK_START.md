# 🚀 Démarrage rapide - SEO Ranker

## 📋 Situation actuelle

### ✅ Ce qui est FAIT
- ✅ Application Next.js complète et fonctionnelle
- ✅ Toutes les API routes configurées
- ✅ Frontend avec interface moderne
- ✅ Export CSV/XLSX horizontal
- ✅ Intégration SerpAPI prête
- ✅ Code 100% compatible Vercel
- ✅ Scripts de déploiement préparés

### ❌ Ce qui BLOQUE
- ❌ **Votre utilisateur AWS n'a pas les permissions DynamoDB**
- ❌ Table `seo_ranker` pas encore créée

---

## 🎯 3 étapes pour déployer (5 minutes)

### Étape 1 : Créer DynamoDB (1 option au choix)

#### Option A : Via un administrateur AWS
Demandez à un admin d'exécuter :
```bash
cd /Users/william/Documents/cursor
bash scripts/create-table-admin.sh
```

#### Option B : Via AWS Console (PLUS RAPIDE)
1. https://console.aws.amazon.com/dynamodbv2
2. Région : **eu-west-3**
3. "Create table"
4. Nom : `seo_ranker`
5. Partition key : `PK` (String)
6. Sort key : `SK` (String)
7. Mode : **On-demand**
8. "Create table"
9. Après création → onglet "Indexes" → "Create index"
10. Nom : `GSI1`, PK : `GSI1PK`, SK : `GSI1SK`

### Étape 2 : Push sur GitHub
```bash
cd /Users/william/Documents/cursor

git init
git add .
git commit -m "Initial commit"

# Via GitHub CLI
gh repo create seo-ranker --private --source=. --remote=origin --push

# OU créer manuellement sur github.com puis :
git remote add origin https://github.com/VOTRE_USERNAME/seo-ranker.git
git push -u origin main
```

### Étape 3 : Déployer sur Vercel
1. https://vercel.com → Login avec GitHub
2. "New Project" → Importer `seo-ranker`
3. Ajouter variables d'environnement :
   - `SERPAPI_API_KEY`
   - `DYNAMODB_TABLE` = `seo_ranker`
   - `AWS_REGION` = `eu-west-3`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. "Deploy"
5. ✅ **C'est en ligne !**

---

## 📚 Documentation complète

| Fichier | Description |
|---------|-------------|
| `README.md` | Documentation complète du projet |
| `DEPLOYMENT_STATUS.md` | Statut actuel du déploiement |
| `GITHUB_VERCEL_GUIDE.md` | Guide GitHub + Vercel détaillé |
| `DEPLOY_AWS.md` | Résolution des problèmes AWS |
| `docs/API.md` | Documentation de l'API |
| `scripts/create-table-admin.sh` | Script création DynamoDB |
| `scripts/vercel-compatibility-check.js` | Test de compatibilité |

---

## 💰 Coût total : 0€/mois

- ✅ Vercel : Gratuit (100 GB/mois)
- ✅ DynamoDB : Gratuit (25 GB + 25 RCU/WCU)
- ⚠️ SerpAPI : 100 recherches/mois gratuites

---

## 🆘 Problème ?

1. **Permissions AWS** → Voir `DEPLOY_AWS.md`
2. **GitHub/Vercel** → Voir `GITHUB_VERCEL_GUIDE.md`
3. **API/Code** → Voir `README.md`

---

**Status** : ⏸️ En attente de création DynamoDB

👉 **Prochaine action** : Créer la table DynamoDB (via Console AWS = 2 minutes)

