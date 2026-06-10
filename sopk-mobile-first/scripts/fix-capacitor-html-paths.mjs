/**
 * Next export utilise des chemins d’assets **racine** `/_next/…` (et `/manifest…`, etc.).
 * Avec `server.appStartPath` (ex. `/plan/index.html`), la WebView Capacitor résout correctement
 * `capacitor://localhost/_next/…` depuis n’importe quelle route ; en revanche des chemins
 * relatifs `../_next/…` depuis `/plan/` peuvent échouer selon la façon dont iOS résout la base URL.
 *
 * On ne réécrit donc plus le HTML : garder la sortie Next telle quelle.
 */
console.log("fix-capacitor-html-paths: aucune réécriture (chemins /_next/ inchangés).");
