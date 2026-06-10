"use client";

import type { ComponentProps } from "react";
import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";

import { toCapacitorStaticFileHref } from "@/utils/capacitorStaticHref";

type Props = {
  /** Chemin logique (ex. `/plan/`) ; réécrit en `…/index.html` pour la WebView Capacitor. */
  href: string;
  children: React.ReactNode;
} & Omit<ComponentProps<"a">, "href" | "children">;

/**
 * Liens natifs + cible fichier réel (`/plan/index.html`, etc.) : le routeur Capacitor iOS
 * ne sert pas les dossiers « extension vides » comme `/plan/` (il retombe sur la racine SPA).
 */
export function CapacitorNavLink({ href, children, className, ...rest }: Props) {
  const fileHref = toCapacitorStaticFileHref(href);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (Capacitor.getPlatform() !== "web") {
        e.preventDefault();
        window.location.assign(fileHref);
      }
    },
    [fileHref],
  );

  return (
    <a href={fileHref} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
}
