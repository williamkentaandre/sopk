# 🔧 Debug DynamoDB - ResourceNotFoundException

## Problème identifié
L'application déployée sur Vercel ne trouve pas la table DynamoDB.

## Vérifications nécessaires

### 1. Variables d'environnement Vercel
Sur Vercel → Settings → Environment Variables, vérifier :

```
DYNAMODB_TABLE=seo_ranker
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=[votre clé]
AWS_SECRET_ACCESS_KEY=[votre secret]
```

### 2. Vérifier la table existe
```bash
aws dynamodb describe-table --table-name seo_ranker --region eu-north-1
```

### 3. Vérifier les permissions AWS
L'utilisateur AWS doit avoir les permissions DynamoDB.

## Solutions possibles

1. **Région incorrecte** : Vérifier que AWS_REGION=eu-north-1
2. **Nom de table incorrect** : Vérifier que DYNAMODB_TABLE=seo_ranker  
3. **Credentials incorrects** : Vérifier les clés AWS
4. **Permissions manquantes** : L'utilisateur n'a pas accès DynamoDB
