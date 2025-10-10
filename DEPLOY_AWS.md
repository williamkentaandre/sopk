# 🚨 Problème de permissions AWS détecté

Votre utilisateur AWS `williamkentaandre` n'a pas les permissions pour créer des tables DynamoDB.

---

## Solution 1 : Ajouter les permissions (Recommandé)

Demandez à votre administrateur AWS d'attacher cette politique à votre utilisateur :

### Politique IAM minimale requise

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:eu-west-3:951979285668:table/seo_ranker",
        "arn:aws:dynamodb:eu-west-3:951979285668:table/seo_ranker/index/*"
      ]
    }
  ]
}
```

### Commande pour l'administrateur

```bash
# Créer la politique
aws iam create-policy \
  --policy-name SEORankerDynamoDBPolicy \
  --policy-document file://dynamodb-policy.json

# Attacher à votre utilisateur
aws iam attach-user-policy \
  --user-name williamkentaandre \
  --policy-arn arn:aws:iam::951979285668:policy/SEORankerDynamoDBPolicy
```

---

## Solution 2 : Utiliser la Console AWS (Plus rapide)

Si vous avez accès à la console AWS :

1. **Aller sur** : https://console.aws.amazon.com/dynamodbv2
2. **Région** : Sélectionner `eu-west-3` (Paris)
3. **Cliquer** : "Create table"
4. **Configuration** :
   - Table name: `seo_ranker`
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)
5. **Table settings** : 
   - Capacity mode: **On-demand** (PAY_PER_REQUEST)
6. **Cliquer** : "Create table"
7. **Après création**, aller dans l'onglet "Indexes"
8. **Cliquer** : "Create index"
   - Partition key: `GSI1PK` (String)
   - Sort key: `GSI1SK` (String)
   - Index name: `GSI1`
   - Projected attributes: **All**
9. **Cliquer** : "Create index"

---

## Solution 3 : Créer un nouvel utilisateur IAM avec bonnes permissions

```bash
# En tant qu'administrateur
aws iam create-user --user-name seo-ranker-user

# Créer access key
aws iam create-access-key --user-name seo-ranker-user

# Attacher la politique DynamoDB complète (pour développement)
aws iam attach-user-policy \
  --user-name seo-ranker-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

---

## Vérifier les permissions actuelles

```bash
# Tester si vous pouvez lister les tables
aws dynamodb list-tables --region eu-west-3

# Tester si la table existe déjà
aws dynamodb describe-table --table-name seo_ranker --region eu-west-3 2>/dev/null || echo "Table n'existe pas"
```

---

## Prochaines étapes

Une fois les permissions configurées ou la table créée manuellement :

1. **Vérifier** : `aws dynamodb describe-table --table-name seo_ranker --region eu-west-3`
2. **Continuer** avec le déploiement sur Vercel
3. **Configurer** les variables d'environnement

---

## Alternative : Utiliser un service managé complet

Si vous n'avez pas accès aux permissions AWS, considérez :

- **Vercel + Vercel KV/Postgres** (sans DynamoDB)
- **Supabase** (PostgreSQL gratuit + auth)
- **MongoDB Atlas** (Free tier permanent)

Dans ce cas, je peux adapter le code pour utiliser une autre base de données.

---

**Que souhaitez-vous faire ?**

1. ✅ Demander les permissions à votre admin AWS
2. ✅ Créer la table via console AWS (plus rapide)
3. ✅ Utiliser un autre service de base de données
4. ✅ Attendre que quelqu'un avec les permissions exécute la commande

