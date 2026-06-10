import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public/icons/icon-512.svg");
const outPath = path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");

const svg = fs.readFileSync(svgPath);
await sharp(svg).resize(1024, 1024).png().toFile(outPath);
console.log("Wrote", outPath);
