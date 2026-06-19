#!/usr/bin/env node
/**
 * Génère les captures App Store (iPhone 6,5" et iPad 12,9") depuis le bundle statique `out/`.
 * Usage : npm run build && node scripts/capture-app-store-screenshots.mjs
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out");
const screenshotsRoot = path.join(root, "ios", "AppStoreConnect", "screenshots");

const USER_ID = "app-store-screenshots";
const PORT = 3456;

/** Un écran iPhone 6,5" — dimensions App Store exactes via deviceScaleFactor. */
const IPHONE = {
  id: "iphone-6.5",
  cssWidth: 428,
  cssHeight: 926,
  scale: 3,
  outWidth: 1284,
  outHeight: 2778,
};

const IPAD = {
  id: "ipad-12.9",
  outWidth: 2048,
  outHeight: 2732,
};

const defaultProfile = {
  prenom: "Johana",
  age: 36,
  poidsKg: 87,
  tailleCm: 165,
  parcoursPerte: "j90",
  objectifPoidsKg: 77,
  objectifs: ["Apaiser mon poids dans le cadre du SOPK"],
  diagnostics: ["SOPK"],
  symptomes: ["Peu ou pas de tout cela"],
  tentativePertePoids: "Oui, plusieurs fois (yo-yo)",
  niveauActivite: "Sédentaire",
  rythmeRepas: "3 repas",
  tempsCuisine: "15 - 30 min",
  regimeAlimentaire: "Végétarienne",
  alimentsPreferes: ["Avocat", "Poulet"],
  allergies: ["Arachides"],
  alimentsDetestes: ["Brocoli"],
  billingPreference: "yearly",
};

const STORAGE_KEYS = {
  authSession: "sopk_auth_session_v1",
  entitlement: "sopk_entitlement_v1",
  onboarding: "sopk_onboarding_v1",
  onboardingDraft: "sopk_onboarding_draft_v1",
  tracking: "sopk_tracking_v1",
  hydrationMl: "sopk_hydration_ml_v1",
  hydrationDate: "sopk_hydration_date_v1",
  mealChecklist: "sopk_meal_checklist_v1",
  waterProgress: "sopk_water_progress_v1",
  stepProgress: "sopk_step_progress_v1",
};

function scopedKey(base, userScope) {
  return `${base}_${userScope}`;
}

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayIsoLocal() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function authSession() {
  return {
    provider: "apple",
    userId: USER_ID,
    email: "demo@privaterelay.appleid.com",
    fullName: "Johana",
    signedAtIso: new Date().toISOString(),
  };
}

function completedProfile() {
  return {
    ...defaultProfile,
    onboardingCompleted: true,
    programStartDateIso: yesterdayIsoLocal(),
    billingPreference: "yearly",
  };
}

function seedLocalStorage(scenario) {
  const entries = {};
  const auth = authSession();

  if (scenario === "auth") {
    return entries;
  }

  entries[STORAGE_KEYS.authSession] = JSON.stringify(auth);
  entries[scopedKey(STORAGE_KEYS.entitlement, USER_ID)] = "1";

  if (scenario === "onboarding-profil") {
    delete entries[scopedKey(STORAGE_KEYS.entitlement, USER_ID)];
    entries[scopedKey(STORAGE_KEYS.onboardingDraft, USER_ID)] = JSON.stringify({
      step: 5,
      profile: defaultProfile,
    });
    return entries;
  }

  if (scenario === "abonnement") {
    delete entries[scopedKey(STORAGE_KEYS.entitlement, USER_ID)];
    entries[scopedKey(STORAGE_KEYS.onboardingDraft, USER_ID)] = JSON.stringify({
      step: 13,
      profile: defaultProfile,
    });
    return entries;
  }

  if (scenario === "plan-jour-2" || scenario === "repas-portions") {
    entries[scopedKey(STORAGE_KEYS.onboarding, USER_ID)] = JSON.stringify(completedProfile());
    entries[scopedKey(STORAGE_KEYS.tracking, USER_ID)] = JSON.stringify({
      date: todayIsoLocal(),
      humeur: 4,
      energie: 3,
      fringales: 2,
      sommeilHeures: 7,
      pas: 4200,
      repasSuivis: false,
    });
    entries[scopedKey(STORAGE_KEYS.hydrationDate, USER_ID)] = todayIsoLocal();
    entries[scopedKey(STORAGE_KEYS.hydrationMl, USER_ID)] = "900";
    return entries;
  }

  return entries;
}

const SCENARIOS = [
  {
    id: "01-onboarding-profil",
    seed: "onboarding-profil",
    prepare: null,
  },
  {
    id: "02-plan-jour-2",
    seed: "plan-jour-2",
    prepare: async (page) => {
      await page.waitForSelector("text=Jour", { timeout: 20_000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: "03-repas-portions",
    seed: "repas-portions",
    prepare: async (page) => {
      await page.waitForSelector("text=Repas", { timeout: 20_000 });
      const portions = page.getByRole("button", { name: "Portions" }).first();
      await portions.click();
      await page.waitForSelector("text=Masquer", { timeout: 10_000 });
      await frameMealPortionsForScreenshot(page);
      await page.waitForTimeout(400);
    },
  },
  {
    id: "04-abonnement",
    seed: "abonnement",
    prepare: async (page) => {
      await page.waitForSelector("text=Abonnement après", { timeout: 20_000 });
      await page.waitForTimeout(400);
    },
  },
];

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

async function frameMealPortionsForScreenshot(page) {
  await page.evaluate(() => {
    const repasHeading = [...document.querySelectorAll("h2")].find(
      (h) => h.textContent?.trim() === "Repas",
    );
    const repasSection = repasHeading?.closest("section");
    const planRoot = repasSection?.parentElement;
    if (!planRoot || !repasSection) return;

    for (const child of [...planRoot.children]) {
      if (child !== repasSection) {
        child.style.display = "none";
      }
    }

    repasSection.style.margin = "0";
    const main = document.querySelector("main");
    if (main) {
      main.style.paddingBottom = "16px";
    }
  });
}

async function prepareViewportForDeviceScreenshot(page, scenarioId) {
  const mealFocus = scenarioId === "03-repas-portions";
  await page.addStyleTag({
    content: `
      html, body {
        height: ${IPHONE.cssHeight}px !important;
        min-height: 0 !important;
        max-height: ${IPHONE.cssHeight}px !important;
        margin: 0 !important;
        overflow: hidden !important;
      }
      main {
        min-height: 0 !important;
        height: 100% !important;
        max-height: ${IPHONE.cssHeight}px !important;
        overflow: hidden !important;
        ${
          mealFocus
            ? `
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          gap: 12px !important;
        `
            : ""
        }
      }
      .min-h-screen, .h-\\[100dvh\\], .max-h-\\[100dvh\\] {
        min-height: 0 !important;
        height: 100% !important;
        max-height: ${IPHONE.cssHeight}px !important;
      }
    `,
  });
  await page.waitForTimeout(150);
}

async function deriveIpadFromIphone(scenarioId) {
  const iphoneFile = path.join(screenshotsRoot, IPHONE.id, `${scenarioId}.png`);
  const ipadDir = path.join(screenshotsRoot, IPAD.id);
  fs.mkdirSync(ipadDir, { recursive: true });
  const ipadFile = path.join(ipadDir, `${scenarioId}.png`);
  await sharp(iphoneFile)
    .resize(IPAD.outWidth, IPAD.outHeight, {
      fit: "contain",
      background: { r: 245, g: 240, b: 248 },
    })
    .png()
    .toFile(ipadFile);
  console.log(`  ✓ ${IPAD.id}/${scenarioId}.png (depuis iPhone)`);
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url?.split("?")[0] ?? "/");
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const filePath = path.join(outDir, urlPath);
      const safePath = path.normalize(filePath);
      if (!safePath.startsWith(outDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      fs.readFile(safePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": contentType(safePath) });
        res.end(data);
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function captureScenario(page, scenario) {
  const dir = path.join(screenshotsRoot, IPHONE.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${scenario.id}.png`);

  const seeds = seedLocalStorage(scenario.seed);
  await page.goto(`http://127.0.0.1:${PORT}/plan/`, { waitUntil: "networkidle" });
  await page.evaluate((items) => {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(items)) {
      window.localStorage.setItem(key, value);
    }
  }, seeds);
  await page.reload({ waitUntil: "networkidle" });
  if (scenario.prepare) await scenario.prepare(page);

  await prepareViewportForDeviceScreenshot(page, scenario.id);
  await page.screenshot({ path: file, type: "png", fullPage: false });

  const meta = await sharp(file).metadata();
  if (meta.width !== IPHONE.outWidth || meta.height !== IPHONE.outHeight) {
    console.warn(
      `  ! ${scenario.id}: ${meta.width}×${meta.height} (attendu ${IPHONE.outWidth}×${IPHONE.outHeight})`,
    );
  }
  console.log(`  ✓ ${IPHONE.id}/${scenario.id}.png`);
}

async function main() {
  if (!fs.existsSync(path.join(outDir, "plan", "index.html"))) {
    console.error("Bundle manquant : lancez d’abord `npm run build`.");
    process.exit(1);
  }

  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });

  try {
    console.log(`\n${IPHONE.id} (${IPHONE.outWidth}×${IPHONE.outHeight})`);
    const context = await browser.newContext({
      viewport: { width: IPHONE.cssWidth, height: IPHONE.cssHeight },
      deviceScaleFactor: IPHONE.scale,
      locale: "fr-FR",
      colorScheme: "light",
    });
    const page = await context.newPage();
    for (const scenario of SCENARIOS) {
      await captureScenario(page, scenario);
    }
    await context.close();

    console.log(`\n${IPAD.id} (${IPAD.outWidth}×${IPAD.outHeight})`);
    for (const scenario of SCENARIOS) {
      await deriveIpadFromIphone(scenario.id);
    }

    console.log(`\nCaptures enregistrées dans ${screenshotsRoot}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
