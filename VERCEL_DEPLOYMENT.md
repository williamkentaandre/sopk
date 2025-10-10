# 🚀 Déploiement sur Vercel - Guide Final

## ✅ AWS DynamoDB : CONFIGURÉ

- Table : `seo_ranker` 
- Région : **eu-north-1** (Stockholm)
- Status : ACTIVE ✅
- Index GSI1 : ACTIVE ✅

---

## 📋 Étapes de déploiement

### Option 1 : Via GitHub Desktop (RECOMMANDÉ - Le plus simple)

#### Étape 1 : Installer GitHub Desktop

1. Télécharger : **https://desktop.github.com**
2. Installer et ouvrir l'application
3. Se connecter avec votre compte GitHub

#### Étape 2 : Créer le repository

1. Dans GitHub Desktop : **File** → **Add Local Repository**
2. Choisir : `/Users/william/Documents/cursor`
3. Si demandé "not a Git repository" : Cliquer "**Create a Repository**"
4. Name : `seo-ranker`
5. Cliquer "**Create Repository**"

#### Étape 3 : Commit initial

1. GitHub Desktop montre tous les fichiers
2. Dans "Summary" (en bas) : taper `Initial commit`
3. Cliquer "**Commit to main**"

#### Étape 4 : Publier sur GitHub

1. Cliquer "**Publish repository**" (en haut)
2. Name : `seo-ranker`
3. ✅ Cocher "**Keep this code private**"
4. Cliquer "**Publish Repository**"

**✅ Votre code est maintenant sur GitHub !**

---

### Étape 5 : Déployer sur Vercel

#### 5.1 : Créer un compte / Se connecter

1. Aller sur **https://vercel.com**
2. Cliquer "**Sign Up**"
3. Choisir "**Continue with GitHub**"
4. Autoriser Vercel à accéder à GitHub

#### 5.2 : Importer le projet

1. Dashboard Vercel → Cliquer "**Add New...**" → "**Project**"
2. Chercher et sélectionner le repo : `seo-ranker`
3. Cliquer "**Import**"

#### 5.3 : Configurer le projet

Vercel détecte automatiquement Next.js :
- Framework Preset : **Next.js** ✅ (auto-détecté)
- Build Command : `npm run build` ✅
- Output Directory : `.next` ✅

#### 5.4 : **IMPORTANT** - Ajouter les variables d'environnement

Avant de cliquer "Deploy", développer la section "**Environment Variables**"

Ajouter ces 5 variables **OBLIGATOIRES** :

| Name | Value |
|------|-------|
| `SERPAPI_API_KEY` | Votre clé SerpAPI |
| `DYNAMODB_TABLE` | `seo_ranker` |
| `AWS_REGION` | `eu-north-1` ⚠️ IMPORTANT |
| `AWS_ACCESS_KEY_ID` | Votre AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | Votre AWS Secret Key |

**Pour chaque variable :**
1. Name : copier le nom exactement
2. Value : coller votre valeur
3. Environment : laisser "Production" coché
4. Cliquer "Add"

#### 5.5 : Déployer !

1. Une fois les 5 variables ajoutées, cliquer "**Deploy**"
2. Attendre 2-3 minutes ☕
3. Vercel build et déploie automatiquement

**🎉 C'est terminé !**

Vous obtenez une URL : `https://seo-ranker-xxxxx.vercel.app`

---

## 🧪 Tester l'application

### Test 1 : Health Check

```bash
curl https://VOTRE-URL.vercel.app/api/v1/health
```

Résultat attendu :
```json
{
  "ok": true,
  "serpapi": "reachable",
  "timestamp": "2025-10-10T..."
}
```

### Test 2 : Interface Web

1. Ouvrir l'URL dans votre navigateur
2. Configurer `hl` = `fr` et `gl` = `fr`
3. Cliquer "Sauvegarder"
4. Ajouter un couple mot-clé/URL
5. Cliquer sur "▶" pour mesurer
6. Vérifier que la position s'affiche

### Test 3 : Export

1. Cliquer "Export CSV"
2. Le fichier devrait se télécharger

---

## 🔐 Où trouver les valeurs des variables

### SERPAPI_API_KEY
1. Aller sur https://serpapi.com
2. Créer un compte (gratuit : 100 recherches/mois)
3. Dashboard → "API Key"
4. Copier la clé

### AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY
1. Console AWS → IAM → Users
2. Sélectionner `williamkentaandre`
3. Onglet "**Security credentials**"
4. "**Create access key**"
5. Use case : "Application running outside AWS"
6. Copier l'Access Key et le Secret Key

**⚠️ IMPORTANT** : Sauvegarder le Secret Key, il ne sera plus affiché !

---

## 🔄 Mises à jour futures

Une fois déployé, chaque modification est automatiquement redéployée :

1. Modifier le code localement
2. Dans GitHub Desktop :
   - Les changements apparaissent automatiquement
   - Ajouter un message de commit
   - Cliquer "Commit to main"
   - Cliquer "Push origin"
3. **Vercel redéploie automatiquement !** 🚀

Vous pouvez suivre le déploiement sur le dashboard Vercel.

---

## 📊 Dashboard Vercel - Que faire après ?

### Voir les logs
1. Dashboard → Votre projet
2. Onglet "**Deployments**"
3. Cliquer sur un déploiement
4. Voir les logs en temps réel

### Voir les analytics
1. Onglet "**Analytics**"
2. Trafic, performances, erreurs

### Ajouter un domaine personnalisé (optionnel)
1. Onglet "**Settings**" → "**Domains**"
2. Ajouter votre domaine
3. Configurer les DNS

---

## 🐛 Dépannage

### Erreur : "DynamoDB Access Denied"
- Vérifier que `AWS_REGION` = `eu-north-1` (pas eu-west-3!)
- Vérifier les credentials AWS
- Vérifier les permissions de l'utilisateur IAM

### Erreur : "SerpAPI unavailable"
- Vérifier la clé API
- Vérifier les quotas (100 requêtes/mois sur plan gratuit)

### Build failed
- Voir les logs dans Vercel
- Vérifier que tous les fichiers sont bien sur GitHub

---

## 💰 Coûts

- ✅ **Vercel** : 0€ (plan gratuit)
- ✅ **DynamoDB** : 0€ (Free Tier : 25 GB, 25 RCU/WCU)
- ⚠️ **SerpAPI** : Gratuit (100 recherches/mois) puis $50/mois

**Total estimé : 0€/mois** pour usage personnel

---

## ✅ Checklist finale

- [ ] GitHub Desktop installé
- [ ] Repository créé sur GitHub
- [ ] Code pushé sur GitHub
- [ ] Compte Vercel créé
- [ ] Projet importé sur Vercel
- [ ] 5 variables d'environnement ajoutées (dont AWS_REGION=eu-north-1)
- [ ] Déploiement lancé
- [ ] URL reçue
- [ ] Health check OK
- [ ] Test dans le navigateur OK

---

## 🎉 Félicitations !

Votre application SEO Ranker est maintenant :

- ✅ Hébergée gratuitement sur Vercel
- ✅ Connectée à DynamoDB (eu-north-1)
- ✅ Accessible mondialement
- ✅ Avec HTTPS automatique
- ✅ CI/CD automatique via GitHub

**Bon suivi de positions ! 🚀**

---

## 📞 Support

- Documentation complète : `README.md`
- API Documentation : `docs/API.md`
- Questions : Ouvrir une issue sur GitHub

**Prochaines étapes suggérées :**
1. Ajouter vos premiers mots-clés
2. Configurer un domaine personnalisé
3. Planifier des mesures régulières (via cron externe si besoin)

