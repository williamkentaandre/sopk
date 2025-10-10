# 🔐 Variables d'environnement pour Vercel

## ⚠️ IMPORTANT : Région DynamoDB

Votre table est dans la région **`eu-north-1`** (Stockholm), pas eu-west-3 !

---

## 📋 Variables à configurer dans Vercel

### Variables OBLIGATOIRES (5)

```
SERPAPI_API_KEY=votre_cle_serpapi
DYNAMODB_TABLE=seo_ranker
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### Variables OPTIONNELLES

```
EXPORT_MAX_POINTS=50
ADMIN_KEY=
```

---

## 🔑 Comment obtenir chaque valeur

### 1. SERPAPI_API_KEY

**Où ?** https://serpapi.com

**Comment ?**
1. Créer un compte (gratuit)
2. Aller dans Dashboard
3. Copier votre "API Key"

**Plan gratuit** : 100 recherches/mois

---

### 2. DYNAMODB_TABLE

**Valeur** : `seo_ranker`

(C'est le nom de votre table DynamoDB)

---

### 3. AWS_REGION

**Valeur** : `eu-north-1`

⚠️ **ATTENTION** : Ne pas mettre `eu-west-3` !

Votre table est dans la région Stockholm (eu-north-1).

---

### 4. AWS_ACCESS_KEY_ID

**Où ?** Console AWS → IAM

**Comment ?**
1. https://console.aws.amazon.com/iam
2. Users → `williamkentaandre`
3. Onglet "Security credentials"
4. Bouton "Create access key"
5. Use case : "Application running outside AWS"
6. Next → Create
7. Copier l'**Access key ID** (commence par `AKIA...`)

---

### 5. AWS_SECRET_ACCESS_KEY

**Où ?** Même processus que ci-dessus

**Important** :
- Apparaît seulement à la création
- Le télécharger ou le copier immédiatement
- Ne le partager avec personne

---

## 📝 Comment ajouter dans Vercel

### Méthode 1 : Lors du déploiement initial

1. Vercel → Import Project
2. Avant de cliquer "Deploy"
3. Section "**Environment Variables**" → Expand
4. Pour chaque variable :
   - Name : `SERPAPI_API_KEY`
   - Value : coller la valeur
   - Environment : cocher "Production"
   - Cliquer "Add"
5. Répéter pour les 5 variables

### Méthode 2 : Après déploiement

1. Dashboard Vercel → Votre projet
2. Onglet "**Settings**"
3. Section "**Environment Variables**"
4. Ajouter chaque variable
5. Redéployer :
   - Onglet "Deployments"
   - Menu "..." → "Redeploy"

---

## ✅ Vérification

Une fois les variables configurées, tester :

```bash
curl https://VOTRE-URL.vercel.app/api/v1/health
```

Si tout est OK :
```json
{
  "ok": true,
  "serpapi": "reachable"
}
```

Si erreur DynamoDB :
- Vérifier `AWS_REGION=eu-north-1`
- Vérifier les credentials AWS

---

## 🔒 Sécurité

- ✅ Les variables sont chiffrées par Vercel
- ✅ Jamais exposées dans les logs
- ✅ Jamais committées dans Git
- ❌ Ne jamais les partager publiquement

---

## 📊 Récapitulatif

| Variable | Exemple | Où l'obtenir |
|----------|---------|--------------|
| SERPAPI_API_KEY | `abc123...` | serpapi.com |
| DYNAMODB_TABLE | `seo_ranker` | Nom de votre table |
| AWS_REGION | `eu-north-1` | Console DynamoDB (ARN) |
| AWS_ACCESS_KEY_ID | `AKIA...` | IAM Console |
| AWS_SECRET_ACCESS_KEY | `wJalr...` | IAM Console |

---

**Prêt pour le déploiement ! 🚀**

