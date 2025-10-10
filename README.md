# SEO Ranker - Suivi de positions Google

Mini web app de suivi de positions Google par couple **mot-clé / URL** avec export Excel/CSV horizontal.

## Stack Technique

- **Frontend**: Next.js 14/15 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes (Node.js serverless)
- **Base de données**: AWS DynamoDB (Single Table Design)
- **API externe**: SerpAPI (Google Organic Results)
- **Déploiement**: Vercel

## Fonctionnalités

- ✅ Paramètres globaux (`hl` et `gl`) pour tous les mots-clés
- ✅ Gestion CRUD des couples mot-clé / URL
- ✅ Mesure manuelle des positions Google (à la demande)
- ✅ Historisation de toutes les mesures
- ✅ Export CSV/XLSX au format horizontal (mesures les plus récentes à gauche)
- ✅ Interface utilisateur simple et intuitive
- ✅ Correspondance exacte et par domaine
- ✅ Limite de parallélisme pour respecter les quotas SerpAPI

## Prérequis

- Node.js 18+ et npm/yarn
- Compte AWS avec accès DynamoDB
- Clé API SerpAPI (https://serpapi.com)

## Installation

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd seo-ranker
```

### 2. Installer les dépendances

```bash
npm install
# ou
yarn install
```

### 3. Configuration de DynamoDB

Créer une table DynamoDB avec les paramètres suivants:

- **Nom de la table**: `seo_ranker` (ou personnalisé via variable d'environnement)
- **Partition key (PK)**: `PK` (String)
- **Sort key (SK)**: `SK` (String)

Créer un **Global Secondary Index (GSI)** nommé `GSI1`:

- **Partition key**: `GSI1PK` (String)
- **Sort key**: `GSI1SK` (String)
- **Projection**: All attributes

### 4. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet:

```bash
# SerpAPI Configuration (OBLIGATOIRE)
SERPAPI_API_KEY=votre_cle_serpapi

# DynamoDB Configuration (OBLIGATOIRE)
DYNAMODB_TABLE=seo_ranker
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key

# Optionnel - Sécurité
ADMIN_KEY=

# Optionnel - Export
EXPORT_MAX_POINTS=50
```

**Note importante**: Pour le déploiement Vercel, ces variables doivent être configurées dans les paramètres du projet Vercel.

### 5. Lancer en développement

```bash
npm run dev
# ou
yarn dev
```

L'application sera accessible sur http://localhost:3000

## Déploiement sur Vercel

### 1. Connexion et import

```bash
npm install -g vercel
vercel login
vercel
```

### 2. Configuration des variables d'environnement

Dans le dashboard Vercel (Settings > Environment Variables), ajouter:

- `SERPAPI_API_KEY`
- `DYNAMODB_TABLE`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 3. Déploiement

```bash
vercel --prod
```

## Utilisation

### Paramètres globaux

1. Définir la **langue** (`hl`) et l'**emplacement** (`gl`) pour toutes les recherches
2. Exemples: `hl=fr` et `gl=fr` pour la France, `hl=en` et `gl=us` pour les USA
3. Cliquer sur **Sauvegarder**

### Ajouter des couples mot-clé / URL

1. Remplir les champs "Nouveau mot-clé" et URL dans la première ligne du tableau
2. Cliquer sur **Ajouter**
3. Le couple est ajouté à la liste

### Mesurer les positions

**Option 1 - Mesure individuelle**:
- Cliquer sur le bouton **▶** sur la ligne du couple
- La mesure s'effectue et la position s'affiche

**Option 2 - Mesure groupée**:
- Cliquer sur **Mesurer tout** en haut
- Toutes les positions seront mesurées (avec limite de 3 requêtes parallèles)

### Export des données

1. Cliquer sur **Export CSV** ou **Export XLSX**
2. Le fichier se télécharge avec le format horizontal:
   - Colonnes: `Mot-clé | URL | [Date mesure 1] | [Date mesure 2] | ...`
   - Les mesures les plus récentes sont placées immédiatement après la colonne URL

## API Routes

Toutes les routes sont préfixées par `/api/v1/`

### Settings

- `GET /api/v1/settings` - Récupérer les paramètres globaux
- `PUT /api/v1/settings` - Mettre à jour les paramètres

### Pairs (Couples)

- `GET /api/v1/pairs` - Lister tous les couples
- `POST /api/v1/pairs` - Créer un ou plusieurs couples
- `GET /api/v1/pairs/:pairId` - Récupérer un couple
- `PUT /api/v1/pairs/:pairId` - Modifier un couple
- `DELETE /api/v1/pairs/:pairId` - Supprimer un couple

### Tracking

- `POST /api/v1/pairs/:pairId/track` - Mesurer un couple
- `POST /api/v1/track` - Mesurer plusieurs couples (ou tous)

### History

- `GET /api/v1/pairs/:pairId/history` - Récupérer l'historique d'un couple

### Export

- `GET /api/v1/export?format=csv` - Exporter en CSV
- `GET /api/v1/export?format=xlsx` - Exporter en XLSX

### Health

- `GET /api/v1/health` - Vérifier le statut de l'API et de SerpAPI

## Modèle de données (DynamoDB)

### PAIR (couple mot-clé/URL)

```
PK: PAIR#{pairId}
SK: META
GSI1PK: ENTITY#PAIR
GSI1SK: {created_at}

Attributs:
- pair_id: ULID
- keyword: string
- url: string (normalisée)
- raw_url: string (originale)
- created_at: ISO timestamp
- updated_at: ISO timestamp
- last_position: number | null
- last_checked_at: ISO timestamp | null
```

### HISTORY (mesure)

```
PK: PAIR#{pairId}
SK: HISTO#{checked_at}

Attributs:
- checked_at: ISO timestamp
- hl: string
- gl: string
- position: number | null
- matched_url: string | null
- match_type: "exact" | "domain" | "none"
- serp_link: string (optionnel)
- source: "serpapi"
- error: string (optionnel)
```

### SETTINGS (paramètres globaux)

```
PK: APP#SETTINGS
SK: META

Attributs:
- hl: string
- gl: string
- updated_at: ISO timestamp
```

## Normalisation des URLs

Les URLs sont normalisées pour la comparaison:
- Suppression du protocole (`http://` / `https://`)
- Suppression de `www.`
- Suppression du trailing slash
- Suppression des paramètres de tracking (`utm_*`)
- Suppression de l'ancre (#)
- Conversion en minuscules

Exemple: `https://www.example.com/page/?utm_source=google` → `example.com/page`

## Matching des résultats

L'algorithme de matching fonctionne ainsi:

1. **Correspondance exacte**: URL normalisées identiques → `match_type="exact"`
2. **Correspondance domaine**: Même domaine, meilleure position → `match_type="domain"`
3. **Non trouvé**: Aucune correspondance → `match_type="none"`, `position=null`

## Limites et quotas

- **Parallélisme SerpAPI**: Maximum 3 requêtes simultanées
- **Top positions**: Recherche dans les 100 premiers résultats
- **Timeout**: 8 secondes par requête SerpAPI
- **Export**: Limite configurable via `EXPORT_MAX_POINTS` (défaut: illimité)

## Structure du projet

```
seo-ranker/
├── app/
│   ├── api/v1/                 # API Routes
│   │   ├── settings/
│   │   ├── pairs/
│   │   ├── track/
│   │   ├── export/
│   │   └── health/
│   ├── globals.css            # Styles globaux
│   ├── layout.tsx             # Layout principal
│   └── page.tsx               # Page d'accueil (UI)
├── lib/
│   ├── db.ts                  # Client DynamoDB
│   ├── serpapi.ts             # Intégration SerpAPI
│   ├── url-utils.ts           # Normalisation URLs
│   ├── export-utils.ts        # Génération CSV/XLSX
│   ├── types.ts               # Types TypeScript
│   └── validators.ts          # Validation Zod
├── .env.example               # Template variables d'environnement
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Sécurité

Par défaut, l'application n'a pas d'authentification (usage personnel).

Pour activer une protection basique:
1. Définir `ADMIN_KEY=votre_cle_secrete` dans les variables d'environnement
2. Toutes les requêtes API doivent inclure le header: `x-admin-key: votre_cle_secrete`

⚠️ **Note**: Cette protection est minimale. Pour un usage en production multi-utilisateurs, implémenter une authentification robuste.

## Troubleshooting

### Erreur "SerpAPI unavailable"
- Vérifier que `SERPAPI_API_KEY` est correctement configurée
- Vérifier les quotas SerpAPI (limites gratuites/payantes)
- Vérifier la connectivité réseau

### Erreur DynamoDB
- Vérifier les credentials AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Vérifier que la table et le GSI existent
- Vérifier les permissions IAM (lecture/écriture sur la table)

### Export vide
- Vérifier qu'au moins une mesure a été effectuée
- Vérifier les logs serveur pour les erreurs

## Licence

MIT

## Support

Pour toute question ou problème, consulter la documentation ou ouvrir une issue sur le repository GitHub.

