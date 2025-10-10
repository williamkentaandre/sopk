# 🔍 Vérification DynamoDB & Prochaines étapes

## ⚠️ Table DynamoDB non détectée

La table n'a pas été trouvée dans la région `eu-west-3`. 

### 🔎 Veuillez vérifier :

#### 1. La région AWS
Connectez-vous à https://console.aws.amazon.com/dynamodbv2 et vérifiez :
- **En haut à droite** : quelle région est sélectionnée ?
- Régions possibles :
  - `eu-west-3` (Paris) ✅ recommandé
  - `us-east-1` (Virginie du Nord)
  - `eu-west-1` (Irlande)
  - `eu-central-1` (Francfort)

#### 2. Le nom de la table
Dans la console DynamoDB :
- Cliquez sur "Tables" dans le menu de gauche
- Le nom affiché est-il exactement : `seo_ranker` ?
- Pas de majuscules, pas d'espaces, pas de tirets ?

#### 3. Le statut de la table
- Status doit être : **ACTIVE** (vert)
- Si "Creating" : attendez quelques secondes

#### 4. L'index GSI
- Cliquez sur la table `seo_ranker`
- Onglet "Indexes"
- Vous devez voir : `GSI1` avec status **ACTIVE**

---

## ✅ Une fois vérifié, donnez-moi :

```
Région : [eu-west-3 ou autre]
Nom table : [seo_ranker ou autre]
Status : [ACTIVE]
GSI1 : [présent/absent]
```

---

## 🚀 En parallèle : Installation Git (requis pour GitHub)

Votre Mac n'a pas Git installé. Vous avez 2 options :

### Option A : Installer Xcode Command Line Tools (recommandé)
```bash
xcode-select --install
```
Suivez les instructions à l'écran (5-10 minutes).

### Option B : Utiliser GitHub Desktop (plus simple)
1. Télécharger : https://desktop.github.com
2. Installer l'application
3. Elle inclut Git automatiquement

---

## 📋 Plan de déploiement (une fois DynamoDB confirmé)

### Méthode 1 : Avec Git (recommandé)
```bash
# 1. Initialiser Git
cd /Users/william/Documents/cursor
git init
git add .
git commit -m "Initial commit"

# 2. Créer repo GitHub
gh repo create seo-ranker --private --source=. --remote=origin --push
# OU via GitHub Desktop

# 3. Connecter à Vercel
# Via dashboard Vercel → Import depuis GitHub
```

### Méthode 2 : Sans Git (upload direct)
```bash
# Installer Vercel CLI
npm install -g vercel  # ou : brew install vercel-cli

# Déployer directement
cd /Users/william/Documents/cursor
vercel
```

Vercel uploadera les fichiers directement sans Git.

---

## 🔧 Commandes de vérification DynamoDB

### Tester la connexion dans différentes régions :

```bash
# Paris (eu-west-3)
aws dynamodb list-tables --region eu-west-3

# Virginie (us-east-1)
aws dynamodb list-tables --region us-east-1

# Irlande (eu-west-1)
aws dynamodb list-tables --region eu-west-1

# Francfort (eu-central-1)
aws dynamodb list-tables --region eu-central-1
```

### Une fois la région trouvée :

```bash
# Remplacez REGION par la bonne région
aws dynamodb describe-table \
  --table-name seo_ranker \
  --region REGION \
  --query 'Table.[TableName,TableStatus,GlobalSecondaryIndexes[0].[IndexName,IndexStatus]]' \
  --output table
```

---

## 📞 Prochaines actions

1. ☐ **Confirmer la région et le nom de la table DynamoDB**
2. ☐ **Installer Git** (xcode-select --install ou GitHub Desktop)
3. ☐ **Créer le repo GitHub**
4. ☐ **Déployer sur Vercel**

---

## 💡 Astuce rapide

Si vous voulez voir toutes vos tables DynamoDB dans toutes les régions :

```bash
for region in eu-west-3 us-east-1 eu-west-1 eu-central-1; do
  echo "=== Région: $region ==="
  aws dynamodb list-tables --region $region --output table 2>/dev/null || echo "Pas d'accès"
  echo ""
done
```

---

**En attente de vos informations sur DynamoDB pour continuer ! 📊**

