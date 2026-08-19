import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutrisopk.app',
  appName: 'SOPK Nutrition',
  webDir: 'out',
  /** Réduit le flash sombre pendant les transitions WKWebView (fond derrière la vue si opaque = false). */
  backgroundColor: '#faf5ff',
  /**
   * Ouvre directement le fichier `plan/index.html` (AppShell) : le routeur iOS sans extension
   * peut servir la mauvaise ressource pour `/plan/` → écran « This page couldn’t load ».
   * Évite aussi les conflits avec `window.location.replace` au chargement (cadre interrompu).
   * @see https://capacitorjs.com/docs/config (server.appStartPath, depuis 7.3)
   */
  server: {
    appStartPath: '/plan/index.html',
  },
};

export default config;
