import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public/icons/icon-512.svg");
const publicIconsDir = path.join(root, "public/icons");

const appIconDir = path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const splashDir = path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset");
const ascExportDir = path.join(root, "ios/AppStoreConnect");

/** Fond opaque obligatoire pour App Store / StoreKit (pas de canal alpha). */
const ICON_BG = { r: 245, g: 240, b: 255 };
const svg = fs.readFileSync(svgPath);

function opaqueAppIconPng(size) {
  return sharp(svg)
    .resize(size, size)
    .flatten({ background: ICON_BG })
    .png({ compressionLevel: 9, force: true });
}

const appIconPath = path.join(appIconDir, "AppIcon-1024.png");
await opaqueAppIconPng(1024).toFile(appIconPath);
console.log("Wrote", appIconPath, "(opaque, sans alpha)");

for (const [name, size] of [
  ["app-icon-180.png", 180],
  ["app-icon-512.png", 512],
]) {
  const out = path.join(publicIconsDir, name);
  await opaqueAppIconPng(size).toFile(out);
  console.log("Wrote", out);
}

fs.mkdirSync(ascExportDir, { recursive: true });
const ascIconPath = path.join(ascExportDir, "AppIcon-1024-AppStoreConnect.png");
await opaqueAppIconPng(1024).toFile(ascIconPath);
console.log("Wrote", ascIconPath, "(à uploader dans App Store Connect si besoin)");

const splashSize = 2732;
const logoSize = 760;
const logo = await opaqueAppIconPng(logoSize).toBuffer();
const splash = await sharp({
  create: {
    width: splashSize,
    height: splashSize,
    channels: 3,
    background: ICON_BG,
  },
})
  .composite([{ input: logo, gravity: "center" }])
  .png()
  .toBuffer();

for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  const out = path.join(splashDir, name);
  await sharp(splash).toFile(out);
  console.log("Wrote", out);
}

const legacyIcon = path.join(appIconDir, "AppIcon-512@2x.png");
if (fs.existsSync(legacyIcon)) {
  fs.unlinkSync(legacyIcon);
}

const contentsPath = path.join(appIconDir, "Contents.json");
fs.writeFileSync(
  contentsPath,
  `${JSON.stringify(
    {
      images: [
        {
          filename: "AppIcon-1024.png",
          idiom: "universal",
          platform: "ios",
          size: "1024x1024",
        },
      ],
      info: { author: "xcode", version: 1 },
    },
    null,
    2,
  )}\n`,
);

const meta = await sharp(appIconPath).metadata();
console.log(`Vérification AppIcon: ${meta.width}x${meta.height}, alpha=${meta.hasAlpha === true}`);
