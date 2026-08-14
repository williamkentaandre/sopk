/** Incrémenter après remplacement de fichiers dans `public/images/`. */
export const PUBLIC_IMAGE_VERSION = "2";

export function publicImagePath(absPath: string): string {
  return `${absPath}?v=${PUBLIC_IMAGE_VERSION}`;
}
