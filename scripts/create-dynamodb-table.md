# Script de création de la table DynamoDB

## Via AWS CLI

```bash
# Créer la table principale
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
    "[
      {
        \"IndexName\": \"GSI1\",
        \"KeySchema\": [
          {\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\": {
          \"ReadCapacityUnits\": 5,
          \"WriteCapacityUnits\": 5
        }
      }
    ]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region eu-west-3
```

## Via AWS Console

1. **Accéder à DynamoDB**:
   - Aller sur la console AWS
   - Rechercher "DynamoDB"
   - Cliquer sur "Create table"

2. **Configuration de base**:
   - Table name: `seo_ranker`
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)

3. **Settings**:
   - Table class: Standard
   - Capacity mode: Provisioned (5 RCU / 5 WCU) ou On-demand

4. **Créer le Global Secondary Index (GSI)**:
   - Après création de la table, aller dans l'onglet "Indexes"
   - Cliquer sur "Create index"
   - Partition key: `GSI1PK` (String)
   - Sort key: `GSI1SK` (String)
   - Index name: `GSI1`
   - Projected attributes: All
   - Cliquer sur "Create index"

## Vérification

```bash
# Vérifier la table
aws dynamodb describe-table --table-name seo_ranker --region eu-west-3

# Lister les index
aws dynamodb describe-table \
  --table-name seo_ranker \
  --region eu-west-3 \
  --query 'Table.GlobalSecondaryIndexes[*].[IndexName,IndexStatus]' \
  --output table
```

## Permissions IAM requises

Votre utilisateur AWS doit avoir les permissions suivantes:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:eu-west-3:*:table/seo_ranker",
        "arn:aws:dynamodb:eu-west-3:*:table/seo_ranker/index/*"
      ]
    }
  ]
}
```

## Mode On-Demand (recommandé pour démarrer)

Pour utiliser le mode on-demand (facturation à l'utilisation sans provisionnement):

```bash
aws dynamodb update-table \
  --table-name seo_ranker \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-3
```

## Coûts estimés

**Mode Provisioned (5 RCU/WCU)**:
- ~$2.50/mois (selon région)

**Mode On-Demand**:
- ~$0.25 par million de requêtes en lecture
- ~$1.25 par million de requêtes en écriture
- Idéal pour faible utilisation

## Suppression de la table

⚠️ **ATTENTION**: Cette commande supprime définitivement toutes les données!

```bash
aws dynamodb delete-table --table-name seo_ranker --region eu-west-3
```

