/**
 * Vérifie qu’un export statique `out/` est présent avant `cap copy` / `cap sync`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, "..", "out", "index.html");

if (!fs.existsSync(indexPath)) {
  console.error(
    "assert-capacitor-out: `out/index.html` absent. Lance d’abord `npm run cap:deploy` ou `npx next build --webpack`.",
  );
  process.exit(1);
}

console.log("assert-capacitor-out: OK (`out/` présent).");
