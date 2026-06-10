import { Capacitor } from "@capacitor/core";

/**
 * Sur iOS, `WebViewAssetHandler` utilise `CapacitorRouter` : tout chemin **sans extension**
 * est traité comme une SPA et renvoie **toujours** `…/index.html` à la racine du bundle.
 * Les URLs du style `/plan/` ou `/support/` rechargeaient donc la page d’accueil au lieu de
 * `plan/index.html` — liens « morts » + flash WebView.
 *
 * Sur **web** (Next), on ne réécrit pas : `/plan/` et `/` restent des routes Next, pas des fichiers
 * `*.html` (évite 404 en dev et hébergeurs qui n’exposent pas `/index.html`).
 *
 * @see `node_modules/@capacitor/ios/Capacitor/Capacitor/Router.swift`
 */
export function toCapacitorStaticFileHref(href: string): string {
  if (Capacitor.getPlatform() === "web") {
    return href;
  }

  if (/^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
    return href;
  }

  let url: URL;
  try {
    url = new URL(href, "https://placeholder.local");
  } catch {
    return href;
  }

  const pathnameRaw = url.pathname;
  if (pathnameRaw.startsWith("/_next/")) {
    return href;
  }

  const pathname = pathnameRaw;
  const suffix = `${url.search}${url.hash}`;

  if (pathname === "/" || pathname === "") {
    /** URL explicite : certains chemins `capacitor://localhost/` seuls ont été moins fiables que `index.html`. */
    return `/index.html${suffix}`;
  }

  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  if (last.includes(".")) {
    return `${pathname}${suffix}`;
  }

  const noTrailing = pathname.endsWith("/") ? pathname.replace(/\/+$/, "") : pathname;
  return `${noTrailing}/index.html${suffix}`;
}
