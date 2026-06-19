import { Capacitor } from "@capacitor/core";

import { isCapacitorNative } from "@/utils/capacitorRuntime";

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
  if (!isCapacitorNative()) {
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

/** Profondeur du dossier courant (ex. `/plan/index.html` → 1). */
function capacitorAssetFolderDepth(pathname: string): number {
  if (pathname.endsWith("/index.html")) {
    return pathname.slice(0, -"/index.html".length).split("/").filter(Boolean).length;
  }
  if (pathname.endsWith("/")) {
    return pathname.slice(0, -1).split("/").filter(Boolean).length;
  }
  return pathname.split("/").filter(Boolean).length;
}

/**
 * Chemins publics (`/icons/…`, `/images/…`) depuis une sous-route Capacitor (`/plan/index.html`).
 * Sans préfixe `../`, iOS ne résout pas les assets à la racine du bundle `out/`.
 */
export function capacitorPublicAsset(absPath: string): string {
  if (!isCapacitorNative()) return absPath;
  if (!absPath.startsWith("/")) return absPath;

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/plan/index.html";
  const depth = capacitorAssetFolderDepth(pathname);
  if (depth === 0) return absPath;

  return `${"../".repeat(depth)}${absPath.slice(1)}`;
}
