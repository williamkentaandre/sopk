#!/bin/bash

# Script à exécuter par un administrateur AWS ayant les permissions DynamoDB
# Ce script crée la table seo_ranker avec le GSI nécessaire

echo "🔧 Création de la table DynamoDB pour SEO Ranker..."
echo ""

# Configuration
TABLE_NAME="seo_ranker"
REGION="eu-west-3"

# Créer la table
echo "📊 Création de la table $TABLE_NAME..."
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{
      "IndexName":"GSI1",
      "KeySchema":[
        {"AttributeName":"GSI1PK","KeyType":"HASH"},
        {"AttributeName":"GSI1SK","KeyType":"RANGE"}
      ],
      "Projection":{"ProjectionType":"ALL"}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✅ Table créée avec succès!"
  echo ""
  echo "⏳ Attente que la table soit active..."
  
  # Attendre que la table soit active
  aws dynamodb wait table-exists \
    --table-name $TABLE_NAME \
    --region $REGION
  
  echo ""
  echo "✅ Table active!"
  echo ""
  echo "📋 Détails de la table:"
  aws dynamodb describe-table \
    --table-name $TABLE_NAME \
    --region $REGION \
    --query 'Table.[TableName,TableStatus,ItemCount,GlobalSecondaryIndexes[0].[IndexName,IndexStatus]]' \
    --output table
  
  echo ""
  echo "🎉 Configuration DynamoDB terminée!"
  echo ""
  echo "📝 Prochaines étapes:"
  echo "  1. Configurer les credentials AWS pour l'utilisateur williamkentaandre"
  echo "  2. Déployer l'application sur Vercel"
  echo "  3. Configurer les variables d'environnement sur Vercel"
else
  echo "❌ Erreur lors de la création de la table"
  exit 1
fi

