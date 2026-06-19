import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString();
const targets = [
  path.join(root, "out/build-stamp.txt"),
  path.join(root, "ios/App/App/public/build-stamp.txt"),
];

for (const file of targets) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${stamp}\n`);
}

console.log("build-stamp:", stamp);
