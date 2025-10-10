# Documentation API

Base URL: `/api/v1/`

Toutes les routes utilisent le runtime Node.js (serverless Vercel).

---

## Settings

### GET /api/v1/settings

Récupère les paramètres globaux (hl/gl).

**Response 200**:
```json
{
  "hl": "fr",
  "gl": "fr"
}
```

### PUT /api/v1/settings

Met à jour les paramètres globaux.

**Request Body**:
```json
{
  "hl": "fr",
  "gl": "fr"
}
```

**Response 200**:
```json
{
  "hl": "fr",
  "gl": "fr"
}
```

**Errors**:
- `400`: Invalid parameters (hl/gl must be 2-5 characters)

---

## Pairs

### GET /api/v1/pairs

Liste tous les couples mot-clé/URL.

**Query Parameters**:
- `q` (optional): Search query (searches in keyword and URL)

**Response 200**:
```json
{
  "items": [
    {
      "pair_id": "01J...",
      "keyword": "assurance auto",
      "url": "https://exemple.com/assurance",
      "last_position": 7,
      "last_checked_at": "2025-10-10T07:13:00Z"
    }
  ]
}
```

### POST /api/v1/pairs

Crée un ou plusieurs couples.

**Request Body**:
```json
{
  "pairs": [
    {
      "keyword": "assurance auto",
      "url": "https://exemple.com/assurance"
    },
    {
      "keyword": "mutuelle santé",
      "url": "https://exemple.com/mutuelle"
    }
  ]
}
```

**Response 201**:
```json
{
  "items": [
    {
      "pair_id": "01J...",
      "keyword": "assurance auto",
      "url": "https://exemple.com/assurance",
      "last_position": null,
      "last_checked_at": null
    }
  ]
}
```

**Errors**:
- `400`: Invalid data (empty keyword, malformed URL)
- `409`: Duplicate pair exists

### GET /api/v1/pairs/:pairId

Récupère un couple spécifique.

**Response 200**:
```json
{
  "pair_id": "01J...",
  "keyword": "assurance auto",
  "url": "https://exemple.com/assurance",
  "last_position": 7,
  "last_checked_at": "2025-10-10T07:13:00Z"
}
```

**Errors**:
- `404`: Pair not found

### PUT /api/v1/pairs/:pairId

Met à jour un couple.

**Request Body**:
```json
{
  "keyword": "nouveau mot-clé",
  "url": "https://nouvelle-url.com"
}
```

**Response 200**:
```json
{
  "pair_id": "01J...",
  "keyword": "nouveau mot-clé",
  "url": "https://nouvelle-url.com",
  "last_position": 7,
  "last_checked_at": "2025-10-10T07:13:00Z"
}
```

**Errors**:
- `400`: Invalid data
- `404`: Pair not found

### DELETE /api/v1/pairs/:pairId

Supprime un couple.

**Query Parameters**:
- `purge_history` (optional): `true` to also delete history entries

**Response 204**: No content

**Errors**:
- `404`: Pair not found

---

## Tracking

### POST /api/v1/pairs/:pairId/track

Mesure la position d'un couple spécifique.

**Request Body** (optional):
```json
{
  "hl": "fr",
  "gl": "fr"
}
```

Si `hl`/`gl` non fournis, utilise les paramètres globaux.

**Response 200**:
```json
{
  "pair_id": "01J...",
  "checked_at": "2025-10-10T07:13:00Z",
  "hl": "fr",
  "gl": "fr",
  "position": 12,
  "matched_url": "https://exemple.com/assurance",
  "match_type": "exact"
}
```

**Match Types**:
- `exact`: URL normalisée identique
- `domain`: Même domaine, meilleure position
- `none`: Non trouvé (position = null)

**Errors**:
- `404`: Pair not found
- `429`: Too many requests (throttling)
- `502`: SerpAPI error

### POST /api/v1/track

Mesure plusieurs couples (ou tous).

**Request Body**:
```json
{
  "pair_ids": ["01J...1", "01J...2"],
  "hl": "fr",
  "gl": "fr"
}
```

Si `pair_ids` omis, mesure **tous** les couples.

**Response 200**:
```json
{
  "summary": {
    "requested": 2,
    "ok": 2,
    "failed": 0
  },
  "results": [
    {
      "pair_id": "01J...1",
      "keyword": "assurance auto",
      "position": 3,
      "match_type": "exact",
      "matched_url": "https://exemple.com/assurance",
      "checked_at": "2025-10-10T07:13:00Z"
    },
    {
      "pair_id": "01J...2",
      "keyword": "mutuelle santé",
      "position": null,
      "match_type": "none",
      "matched_url": null,
      "checked_at": "2025-10-10T07:13:05Z"
    }
  ]
}
```

**Concurrency**: Maximum 3 requêtes SerpAPI en parallèle.

**Errors**:
- `429`: Throttling
- `502`: SerpAPI global error

---

## History

### GET /api/v1/pairs/:pairId/history

Récupère l'historique des mesures d'un couple.

**Query Parameters**:
- `limit` (default: 50, max: 500)
- `from` (ISO datetime, optional)
- `to` (ISO datetime, optional)
- `order` (default: `desc`, values: `asc|desc`)

**Response 200**:
```json
{
  "items": [
    {
      "checked_at": "2025-10-10T07:13:00Z",
      "hl": "fr",
      "gl": "fr",
      "position": 7,
      "matched_url": "https://exemple.com/assurance",
      "match_type": "exact",
      "serp_link": "https://serpapi.com/searches/abc123",
      "source": "serpapi"
    },
    {
      "checked_at": "2025-10-08T10:00:00Z",
      "hl": "fr",
      "gl": "fr",
      "position": 4,
      "matched_url": "https://exemple.com/assurance",
      "match_type": "exact",
      "source": "serpapi"
    }
  ]
}
```

**Errors**:
- `400`: Invalid query parameters
- `404`: Pair not found

---

## Export

### GET /api/v1/export

Exporte les données au format CSV ou XLSX.

**Query Parameters**:
- `format` (default: `csv`, values: `csv|xlsx`)
- `pair_ids` (optional): Comma-separated list of pair IDs
- `max_points` (optional): Limit number of measurement columns

**Response 200**:
- Content-Type: `text/csv` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="seo-export-YYYYMMDD-HHmm.{csv|xlsx}"`

**Format horizontal**:
```csv
"Mot-clé","URL","2025-10-10 09:15","2025-10-08 10:00"
"assurance auto","https://exemple.com/assurance",4,7
"mutuelle santé","https://exemple.com/mutuelle","-",12
```

Colonnes:
1. Mot-clé
2. URL
3..N. Dates de mesure (plus récente à gauche)

Valeurs:
- Nombre = position
- `-` = non trouvé

**Errors**:
- `400`: Invalid parameters

---

## Health

### GET /api/v1/health

Vérifie l'état de l'API et de SerpAPI.

**Response 200**:
```json
{
  "ok": true,
  "serpapi": "reachable",
  "timestamp": "2025-10-10T07:13:00Z"
}
```

**SerpAPI Status Values**:
- `reachable`: SerpAPI accessible
- `unreachable`: SerpAPI inaccessible
- `not_configured`: SERPAPI_API_KEY non configurée
- `error`: Erreur lors de la vérification

---

## Error Responses

Format standard:
```json
{
  "error": {
    "code": 400,
    "message": "Invalid parameters",
    "details": { ... }
  }
}
```

**HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `204`: No content
- `400`: Bad request (validation error)
- `404`: Not found
- `409`: Conflict (duplicate)
- `429`: Too many requests (throttling)
- `500`: Internal server error
- `502`: Bad gateway (SerpAPI error)

---

## Rate Limits

- **SerpAPI**: Limité par votre quota SerpAPI
- **Parallélisme interne**: Maximum 3 requêtes SerpAPI simultanées
- **Timeout**: 5 secondes par requête SerpAPI

---

## Authentication (Optionnel)

Si `ADMIN_KEY` est défini dans les variables d'environnement, ajouter le header:

```
x-admin-key: votre_cle_secrete
```

Sans ce header, les requêtes retourneront `401 Unauthorized`.

