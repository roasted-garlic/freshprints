/**
 * DEV diagnostic: Playground vs Processing quality parity (read-only; no app source change).
 * Uses saved Settings prompt + cucumber design image for Playground;
 * applies local lean title/desc transform to prove Class B;
 * runs N Processing reprocesses for final capture.
 *
 *   node --import tsx functions/scripts/td034-playground-processing-parity-diag.mjs
 */
import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const {
  resolveLeanCatalogTitle,
  sanitizeCatalogDescription,
} = require(resolve(FUNCTIONS_ROOT, "lib/functions/src/ai/catalogTitleRules.js"));
const {
  stripOcrDumpFromDescription,
  synthesizeSemanticCatalogDescription,
} = require(resolve(FUNCTIONS_ROOT, "lib/packages/shared/src/utils/visibleTextQuality.js"));

const PROJECT_ID = "fresh-prints-dev";
const DESIGN_ID = "Y2IQuCgAPgnqrBIeJuap";
const RUNS = 5;
const OUT = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_td034-playground-processing-parity-diag-results.json",
);
const PASSWORD = `ParityDiag-${randomBytes(18).toString("base64url")}!aA1`;
const RUN_ID = Date.now().toString(36);

function loadPortalEnv() {
  const raw = readFileSync(resolve(REPO_ROOT, "apps/portal/.env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hash(s) {
  return createHash("sha256").update(String(s || "")).digest("hex").slice(0, 16);
}

function classifyTitle(t) {
  const s = String(t || "");
  const lower = s.toLowerCase();
  if (!s.trim()) return "INCORRECT";
  const sloganFirst =
    /when life gives you/i.test(s) ||
    (/go fuck yourself|go f\*\*\* yourself/i.test(s) && /\bwoman\b/i.test(s));
  const visual =
    /\b(woman|girl|pin-?up|holding|cucumber)\b/i.test(s) &&
    !sloganFirst &&
    !/when life/i.test(s);
  if (sloganFirst) return "THIN/AWKWARD";
  if (visual) return "STRONG";
  if (s.split(/\s+/).length >= 4) return "ACCEPTABLE";
  return "THIN/AWKWARD";
}

function classifyDesc(d) {
  const s = String(d || "");
  if (!s.trim()) return "INCORRECT";
  const hasSubject = /\b(woman|girl|pin-?up|holding|holds|cucumber)\b/i.test(s);
  const styleTextOnly =
    /\b(retro|vintage|distressed|style|texture|text|prominently displayed)\b/i.test(s) &&
    !hasSubject;
  const thinSynth = /^A .+ design featuring /.test(s) || /^Apparel artwork featuring /.test(s);
  if (hasSubject && s.length > 80) return "STRONG";
  if (hasSubject) return "ACCEPTABLE";
  if (styleTextOnly || thinSynth || s.length < 60) return "THIN";
  return "ACCEPTABLE";
}

function applyProcessingTransforms(parsed, uploadFileStem = "upload") {
  const title = resolveLeanCatalogTitle({
    candidateTitle: parsed.title,
    tags: parsed.tags || [],
    uploadFileStem,
    description: parsed.description,
    readableTextLines: parsed.readableTextLines,
    centralSubject: parsed.centralSubject,
    subjects: parsed.subjects,
    objects: parsed.objects,
  });
  const scrubbed = stripOcrDumpFromDescription(
    sanitizeCatalogDescription(parsed.description || ""),
  ).slice(0, 500);
  const description =
    scrubbed ||
    synthesizeSemanticCatalogDescription({
      centralSubject: parsed.centralSubject,
      visibleText: parsed.readableTextLines || parsed.visibleText,
    }).slice(0, 500);
  return { title, description, scrubbedEmpty: !scrubbed };
}

function ensureAdmin() {
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return { db: getFirestore(), storage: getStorage() };
}

async function downloadDesignImage(db, storage) {
  const data = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
  const path = String(
    data.previewPath || data.previewStoragePath || data.files?.previewPath || "",
  ).replace(/^\/+/, "");
  if (!path) throw new Error("No preview path");
  const [buf] = await storage.bucket().file(path).download();
  return {
    path,
    bytes: buf,
    sha256: createHash("sha256").update(buf).digest("hex").slice(0, 16),
    mime: path.endsWith(".png") ? "image/png" : "image/webp",
    artworkBackgroundHex: data.artworkBackgroundHex ?? null,
  };
}

async function main() {
  const { db, storage } = ensureAdmin();
  const authAdmin = getAuth();
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  if (settings.catalogWorkflowMode !== "shadow" || settings.catalogAutonomousLiveEnabled === true) {
    throw new Error("Autonomous gate not shadow/off");
  }
  const promptTemplate = settings.promptTemplate || "";
  const image = await downloadDesignImage(db, storage);

  const email = `parity-diag-${RUN_ID}@freshprints.local`;
  const user = await authAdmin.createUser({
    email,
    password: PASSWORD,
    emailVerified: true,
    disabled: false,
  });
  await db.collection("users").doc(user.uid).set({
    role: "owner",
    isActive: true,
    email,
    displayName: `Parity Diag ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const portalEnv = loadPortalEnv();
  const app = initializeApp({
    apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const clientAuth = getClientAuth(app);
  await signInWithEmailAndPassword(clientAuth, email, PASSWORD);
  const fns = getFunctions(app, "us-central1");
  const playground = httpsCallable(fns, "testAiEnrichmentPlayground", { timeout: 180_000 });
  const enqueue = httpsCallable(fns, "enqueueAiEnrichment", { timeout: 180_000 });

  const playgroundRuns = [];
  for (let i = 1; i <= RUNS; i++) {
    console.log(`Playground ${i}/${RUNS}`);
    const resp = await playground({
      prompt: promptTemplate,
      visionModelId: settings.visionModelId || "gemini-2.5-flash-lite",
      imageBase64: image.bytes.toString("base64"),
      imageContentType: image.mime,
    });
    const data = resp.data || {};
    let parsed = {};
    try {
      parsed = JSON.parse(data.outputText || "{}");
    } catch {
      parsed = { _parseError: true };
    }
    const simulated = applyProcessingTransforms(parsed);
    playgroundRuns.push({
      run: i,
      model: data.visionModelId ?? null,
      provider: data.provider ?? null,
      promptHash: hash(promptTemplate),
      imageSha: image.sha256,
      imagePath: image.path,
      rawTitle: parsed.title ?? null,
      rawDescription: parsed.description ?? null,
      centralSubject: parsed.centralSubject ?? null,
      subjects: parsed.subjects ?? null,
      objects: parsed.objects ?? null,
      readableTextLines: parsed.readableTextLines ?? null,
      category: parsed.category ?? null,
      titleClass: classifyTitle(parsed.title),
      descClass: classifyDesc(parsed.description),
      simulatedProcessingTitle: simulated.title,
      simulatedProcessingDescription: simulated.description,
      simulatedTitleClass: classifyTitle(simulated.title),
      simulatedDescClass: classifyDesc(simulated.description),
      titleWouldDegrade: classifyTitle(parsed.title) !== classifyTitle(simulated.title),
      fuckInRaw: /\bfuck\b/i.test(JSON.stringify(parsed)),
      fStarInRaw: /f\*\*\*/i.test(JSON.stringify(parsed)),
    });
    console.log(
      JSON.stringify(
        {
          rawTitle: playgroundRuns[i - 1].rawTitle,
          simulatedTitle: playgroundRuns[i - 1].simulatedProcessingTitle,
          titleClass: playgroundRuns[i - 1].titleClass,
          simClass: playgroundRuns[i - 1].simulatedTitleClass,
        },
        null,
        2,
      ),
    );
  }

  const processingRuns = [];
  for (let i = 1; i <= RUNS; i++) {
    console.log(`Processing ${i}/${RUNS}`);
    const prior = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
    const priorGen = prior.smartProfile?.provenance?.generatedAt || null;
    const startedAt = Date.now();
    const reviewStatus = prior.aiReviewStatus;
    const payload =
      reviewStatus === "needs_review" || reviewStatus === "rejected"
        ? { designId: DESIGN_ID, rerunFromReview: true }
        : { designId: DESIGN_ID };
    await enqueue(payload);
    let capture = null;
    for (let w = 0; w < 90; w++) {
      await sleep(2500);
      const data = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
      const gen = data.smartProfile?.provenance?.generatedAt || null;
      const stage = data.aiProcessingStage;
      if (
        gen &&
        gen !== priorGen &&
        Date.parse(gen) >= startedAt - 15_000 &&
        (stage === "ready_for_review" || data.aiReviewStatus === "needs_review")
      ) {
        const sug = data.aiSuggestions || {};
        const sp = data.smartProfile || {};
        const prov = sp.provenance || {};
        capture = {
          run: i,
          promptVersion: prov.promptVersion || sug.promptVersion,
          model: prov.model || sug.model,
          provider: prov.provider || sug.provider,
          finalTitle: sug.title,
          finalDescription: sug.description,
          category: sug.categoryName || data.categoryName || sp.categoryName,
          subjects: sp.subjects,
          objects: sp.objects,
          centralSubject: sp.centralSubject,
          titleClass: classifyTitle(sug.title),
          descClass: classifyDesc(sug.description),
          fuckInFinal: /\bfuck\b/i.test(String(sug.title) + String(sug.description)),
          fStarInFinal: /f\*\*\*/i.test(String(sug.title) + String(sug.description)),
          artworkBackgroundHex: data.artworkBackgroundHex ?? null,
          previewPath: data.previewPath ?? null,
        };
        break;
      }
      process.stdout.write(".");
    }
    console.log("");
    if (!capture) throw new Error(`Processing run ${i} timed out`);
    processingRuns.push(capture);
    console.log(JSON.stringify({ title: capture.finalTitle, descClass: capture.descClass }, null, 2));
  }

  function count(arr, key) {
    const out = {};
    for (const row of arr) {
      const k = row[key] || "UNKNOWN";
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }

  const result = {
    projectId: PROJECT_ID,
    designId: DESIGN_ID,
    finishedAt: new Date().toISOString(),
    settings: {
      catalogWorkflowMode: settings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
      visionModelId: settings.visionModelId,
      promptHash: hash(promptTemplate),
      promptHasGapSemantics: promptTemplate.includes(
        "Use categoryGapNote only when no approved category is a reasonable fit",
      ),
      promptLength: promptTemplate.length,
    },
    image: {
      path: image.path,
      sha256_16: image.sha256,
      mime: image.mime,
      byteLength: image.bytes.length,
      artworkBackgroundHex: image.artworkBackgroundHex,
    },
    playgroundRuns,
    processingRuns,
    counts: {
      playgroundTitle: count(playgroundRuns, "titleClass"),
      playgroundDesc: count(playgroundRuns, "descClass"),
      simulatedProcessingTitle: count(playgroundRuns, "simulatedTitleClass"),
      simulatedProcessingDesc: count(playgroundRuns, "simulatedDescClass"),
      processingFinalTitle: count(processingRuns, "titleClass"),
      processingFinalDesc: count(processingRuns, "descClass"),
      playgroundTitleWouldDegrade: playgroundRuns.filter((r) => r.titleWouldDegrade).length,
    },
  };

  writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log("Wrote", OUT);
  console.log(JSON.stringify(result.counts, null, 2));

  try {
    await authAdmin.deleteUser(user.uid);
    await db.collection("users").doc(user.uid).delete();
  } catch {
    /* best-effort */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
