# Essai gratuit 7 jours - App Store Connect

L’app **ne gère pas** l’essai en local. Les 7 jours gratuits sont une **offre d’introduction** configurée dans App Store Connect ; StoreKit l’applique au premier abonnement éligible.

## Identifiants produits (déjà dans le projet)

| Formule | Product ID |
|---------|------------|
| Mensuel | `com.nutrisopk.app.sub.monthly` |
| Annuel  | `com.nutrisopk.app.sub.yearly`  |

## Étapes dans App Store Connect

1. Ouvrir [App Store Connect](https://appstoreconnect.apple.com) → **Mes apps** → **Régime SOPK** (`com.nutrisopk.app`).
2. Menu **Fonctionnalités** (ou **Achats intégrés** / **Abonnements**) → groupe d’abonnements **Régime SOPK**.
3. Pour **chaque** abonnement (mensuel et annuel) :
   - Ouvrir l’abonnement → section **Offres d’introduction** (ou **Introductory Offers**).
   - **Créer une offre** :
     - **Type** : Essai gratuit (Free Trial)
     - **Durée** : **1 semaine** (7 jours)
     - **Éligibilité** : nouveaux abonnés (paramètre par défaut Apple)
   - Enregistrer et passer le statut à **Prêt à soumettre** si demandé.
4. **Soumettre** les abonnements avec le prochain build (même version que l’app).
5. Vérifier que les deux offres sont **identiques** (7 jours gratuits) sur mensuel et annuel - l’utilisateur choisit la formule à la fin de l’onboarding.

## Ce que voit l’utilisateur

- Écran d’onboarding étape 12 : « Essai gratuit de 7 jours via l’App Store ».
- Bouton : **Commencer l’essai gratuit de 7 jours**.
- Feuille Apple : **0,00 €** la première semaine, puis le tarif mensuel ou annuel choisi.
- Annulation : **Réglages iPhone → [nom] → Abonnements** avant la fin des 7 jours pour ne pas être facturé.

## Tester SANS compte Sandbox Apple (recommandé en local)

Vous n’avez **pas besoin** de créer un testeur Sandbox dans App Store Connect pour vérifier l’essai 7 jours sur votre Mac/iPhone de dev.

### Fichier fourni

`ios/App/RegimeSOPK.storekit` - abonnements mensuel / annuel avec **essai gratuit 1 semaine (0 €)**.

### Configuration Xcode (une fois)

1. Ouvrir `ios/App/App.xcworkspace` dans Xcode
2. Glisser `RegimeSOPK.storekit` dans le projet **App** (cocher la cible App) si Xcode ne le voit pas encore
3. Menu **Product → Scheme → Edit Scheme…**
4. Onglet **Run** → **Options**
5. **StoreKit Configuration** → choisir **RegimeSOPK.storekit**
6. **Run** sur simulateur ou iPhone branché (build debug depuis Xcode)

Résultat : feuille Apple simulée avec **0,00 €** la 1ʳᵉ semaine, sans compte test Apple.

Renouvellements accélérés : 1 semaine ≈ quelques minutes (réglage `subscriptionRenewalRate: hourly` dans le fichier).

### Réinitialiser un test local

Xcode → **Debug → StoreKit → Manage Transactions…** → supprimer les achats de test.

---

## Test en bac à sable (Sandbox) - optionnel

La feuille de paiement Apple est **100 % contrôlée par Apple**. L’app ne peut pas forcer un essai gratuit - seule une **offre d’introduction** dans App Store Connect + un **compte éligible** le permettent.

### Cause 1 - Offre d’introduction absente ou mal configurée (la plus fréquente)

Dans App Store Connect, pour **chaque** abonnement :

1. Section **Offres d’introduction** (pas « Offres promotionnelles » ni « Codes promo »)
2. Type : **Gratuit** / **Free trial** (pas « Paiement échelonné » à prix réduit)
3. Durée : **1 semaine**
4. Statut : **Prêt à soumettre**, puis **soumis avec le build** de l’app

Attendre **jusqu’à 1 heure** après modification pour que le sandbox se mette à jour.

### Cause 2 - Compte Sandbox déjà utilisé

Apple n’accorde **qu’un seul essai par groupe d’abonnements** et par Apple ID, **à vie** (même en sandbox).

- « Effacer l’historique d’achats » sur l’iPhone **ne suffit souvent pas**
- **Solution fiable** : App Store Connect → **Utilisateurs et accès** → **Testeurs Sandbox** → **créer un nouveau compte** (email fictif unique, ex. `test7-2026@example.com`)
- Ne jamais réutiliser un compte qui a déjà souscrit (même annulé) dans le groupe **Abonnement mensuel**

### Cause 3 - Déjà abonné au mensuel

Si le compte test a déjà pris le **mensuel**, l’**annuel** n’aura pas non plus d’essai (même groupe).

### Vérification dans l’app (après rebuild)

Après `npm run ios:refresh` et Run Xcode :

- Si StoreKit voit l’offre : l’écran affiche **0,00 € aujourd’hui** et la feuille Apple aussi
- Si l’offre manque : un **bandeau orange** s’affiche dans l’app - corriger ASC ou changer de compte test

### Test sandbox accéléré

Réglages → Développeur → **Abonnements Sandbox** : 1 semaine d’essai ≈ **3 minutes** en sandbox.

## Après l’essai

- Si l’utilisateur **ne annule pas** : Apple facture et renouvelle l’abonnement ; l’app garde l’accès tant que `hasActiveSubscriptionFromStore()` est vrai.
- Si l’essai **expire sans abonnement actif** : l’app affiche le **paywall** (écran abonnement) - pas d’accès gratuit permanent.

## Checklist avant resoumission

- [ ] Offre d’introduction **7 jours gratuits** sur mensuel **et** annuel
- [ ] CGU / confidentialité : https://regimesopk.com/terms/ et /privacy/
- [ ] Nouveau build iOS archivé (`npm run ios:refresh` puis Archive Xcode)
- [ ] Capture écran abonnement à jour (`ios/AppStoreConnect/screenshots/.../04-abonnement.png`)

## Commandes build

```bash
cd sopk-mobile-first
npm run ios:refresh
# Puis Xcode → Product → Archive → Distribute
```
