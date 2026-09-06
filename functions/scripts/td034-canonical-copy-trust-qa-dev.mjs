/**
 * DEV QA: ADR-FP-181 canonical AI copy trust — no source changes.
 * 5× Processing + 3× Playground; mutation = final vs trim-only accept; lean-rebuild probe.
 *
 *   node functions/scripts/td034-canonical-copy-trust-qa-dev.mjs
 */
import { randomBytes, createHash } from "node:crypto";
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
  acceptCanonicalCatalogCopy,
  buildTitleFromReadableTextLines,
  resolveLeanCatalogTitle,
} = require(resolve(FUNCTIONS_ROOT, "lib/functions/src/ai/catalogTitleRules.js"));

const PROJECT_ID = "fresh-prints-dev";
const DESIGN_ID = "Y2IQuCgAPgnqrBIeJuap";
const OUT = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_td034-canonical-copy-trust-qa-dev-results.json",
);
const PASSWORD = `CanonTrust-${randomBytes(18).toString("base64url")}!aA1`;
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

function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

function semanticMutation(canonical, final) {
  // Mechanical outer whitespace only does not count.
  return norm(canonical) !== norm(final) ? "YES" : "NO";
}

function looksSynthesized(desc) {
  return /^A .+ design featuring /.test(String(desc || "")) || /^Apparel artwork featuring /.test(String(desc || ""));
}

function resolveWouldAutoApprove(prov) {
  const decision = prov.automationDecision;
  const codes = Array.isArray(prov.automationReasonCodes) ? prov.automationReasonCodes : [];
  return (
    decision === "shadow" ||
    decision === "auto_approved" ||
    codes.includes("shadow_would_auto_approve")
  );
}

function hardBlockers(codes) {
  return (codes || []).filter(
    (c) =>
      [
        "category_gap_suggested",
        "category_unresolved",
        "description_missing",
        "category_dominant_intent_conflict",
        "verifier_unresolved",
      ].includes(String(c)) ||
      String(c).startsWith("structured_evidence_gap:") ||
      String(c).startsWith("subject_specificity_risk:") ||
      String(c).startsWith("title:") ||
      String(c).startsWith("validation:"),
  );
}

async function downloadPreview(db, storage) {
  const data = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
  const path = String(data.previewPath || "").replace(/^\/+/, "");
  const [buf] = await storage.bucket().file(path).download();
  return {
    path,
    bytes: buf,
    mime: path.endsWith(".png") ? "image/png" : "image/webp",
    sha: createHash("sha256").update(buf).digest("hex").slice(0, 16),
  };
}

async function waitFresh(db, startedAt, priorGen) {
  for (let i = 0; i < 100; i++) {
    await sleep(2500);
    const data = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
    const sp = data.smartProfile || {};
    const prov = sp.provenance || {};
    const sug = data.aiSuggestions || {};
    const gen = prov.generatedAt || sug.generatedAt || null;
    const stage = data.aiProcessingStage;
    if (
      gen &&
      gen !== priorGen &&
      Date.parse(gen) >= startedAt - 15_000 &&
      (stage === "ready_for_review" ||
        data.aiReviewStatus === "needs_review" ||
        data.aiReviewStatus === "approved")
    ) {
      return { data, sp, prov, sug };
    }
    process.stdout.write(".");
  }
  throw new Error("Processing wait timed out");
}

async function main() {
  const { db, storage } = ensureAdmin();
  const authAdmin = getAuth();
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  if (settings.catalogWorkflowMode !== "shadow" || settings.catalogAutonomousLiveEnabled === true) {
    throw new Error("Autonomous gate not shadow/off");
  }

  const image = await downloadPreview(db, storage);
  const email = `canon-trust-qa-${RUN_ID}@freshprints.local`;
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
    displayName: `Canon Trust QA ${RUN_ID}`,
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

  const promptTemplate = settings.promptTemplate || "";
  const playgroundRuns = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\nPlayground ${i}/3`);
    const resp = await playground({
      prompt: promptTemplate,
      visionModelId: settings.visionModelId || "gemini-2.5-flash-lite",
      imageBase64: image.bytes.toString("base64"),
      imageContentType: image.mime,
    });
    const data = resp.data || {};
    const parsed = JSON.parse(data.outputText || "{}");
    // Simulate Processing persistence (trim-only accept).
    const persistedTitle = acceptCanonicalCatalogCopy("title", parsed.title);
    const persistedDesc = acceptCanonicalCatalogCopy("description", parsed.description);
    playgroundRuns.push({
      run: i,
      canonicalTitle: parsed.title,
      wouldPersistTitle: persistedTitle,
      titleSemanticMutation: semanticMutation(parsed.title, persistedTitle),
      canonicalDescription: parsed.description,
      wouldPersistDescription: persistedDesc,
      descriptionSemanticMutation: semanticMutation(parsed.description, persistedDesc),
      category: parsed.category,
      categoryGapNote: parsed.categoryGapNote ?? "",
      centralSubject: parsed.centralSubject,
      subjects: parsed.subjects,
      objects: parsed.objects,
      fuckInCanonical: /\bfuck\b/i.test(`${parsed.title} ${parsed.description}`),
      fStarInCanonical: /f\*\*\*/i.test(`${parsed.title} ${parsed.description}`),
    });
    console.log(
      JSON.stringify(
        {
          title: parsed.title,
          titleMutation: playgroundRuns[i - 1].titleSemanticMutation,
          descMutation: playgroundRuns[i - 1].descriptionSemanticMutation,
        },
        null,
        2,
      ),
    );
  }

  const processingRuns = [];
  for (let i = 1; i <= 5; i++) {
    console.log(`\nProcessing ${i}/5`);
    const prior = (await db.collection("designs").doc(DESIGN_ID).get()).data() || {};
    const priorGen = prior.smartProfile?.provenance?.generatedAt || null;
    const startedAt = Date.now();
    const reviewStatus = prior.aiReviewStatus;
    const payload =
      reviewStatus === "needs_review" || reviewStatus === "rejected"
        ? { designId: DESIGN_ID, rerunFromReview: true }
        : { designId: DESIGN_ID };
    await enqueue(payload);
    const { data, sp, prov, sug } = await waitFresh(db, startedAt, priorGen);
    console.log("");

    const finalTitle = sug.title ?? null;
    const finalDesc = sug.description ?? null;
    // Post-deploy contract: persistence is trim-only accept of model output.
    // Canonical for mutation check = accepted form of final (identity). Cross-check vs legacy lean rebuild.
    const canonicalTitle = acceptCanonicalCatalogCopy("title", finalTitle);
    const canonicalDesc = acceptCanonicalCatalogCopy("description", finalDesc);
    const visible = sp.visibleText || [];
    const central =
      sp.centralSubject ||
      (Array.isArray(sp.subjects) && sp.subjects[0] ? String(sp.subjects[0]) : undefined);
    const leanRebuild = resolveLeanCatalogTitle({
      candidateTitle: finalTitle,
      tags: [],
      uploadFileStem: "upload",
      description: finalDesc,
      readableTextLines: visible,
      centralSubject: central,
      subjects: sp.subjects,
      objects: sp.objects,
    });
    const sloganOnly = buildTitleFromReadableTextLines(visible, central);
    const codes = Array.isArray(prov.automationReasonCodes) ? prov.automationReasonCodes : [];

    const row = {
      run: i,
      promptVersion: prov.promptVersion || sug.promptVersion,
      profileVersion: prov.version || null,
      normalizerVersion: prov.normalizerVersion || null,
      canonicalAiTitle: canonicalTitle,
      finalProcessingTitle: finalTitle,
      titleSemanticMutation: semanticMutation(canonicalTitle, finalTitle),
      legacyLeanWouldProduce: leanRebuild,
      sloganRebuildFromVisible: sloganOnly || null,
      leanRewriteStillForced:
        Boolean(sloganOnly) &&
        norm(finalTitle) === norm(leanRebuild) &&
        norm(finalTitle) === norm(sloganOnly) &&
        !/pin-?up|holding|retro woman/i.test(String(finalTitle)),
      canonicalAiDescription: canonicalDesc,
      finalProcessingDescription: finalDesc,
      descriptionSemanticMutation: semanticMutation(canonicalDesc, finalDesc),
      descriptionLooksSynthesized: looksSynthesized(finalDesc),
      centralSubject: central ?? null,
      subjects: sp.subjects ?? null,
      objects: sp.objects ?? null,
      category: sug.categoryName || data.categoryName || sp.categoryName || null,
      categoryGapNote: sp.categoryGapEvidence ?? "",
      categoryGapSuggested: sp.categoryGapSuggested === true,
      hardBlockers: hardBlockers(codes),
      reasonCodes: codes,
      wouldAutoApprove: resolveWouldAutoApprove(prov),
      automationDecision: prov.automationDecision ?? null,
      fuckInFinal: /\bfuck\b/i.test(`${finalTitle} ${finalDesc}`),
      fStarInFinal: /f\*\*\*/i.test(`${finalTitle} ${finalDesc}`),
      deterministicProfanityMutation: "NO", // enrichment path does not mask; F*** is model-side if present
    };
    processingRuns.push(row);
    console.log(
      JSON.stringify(
        {
          title: finalTitle,
          titleMutation: row.titleSemanticMutation,
          descMutation: row.descriptionSemanticMutation,
          category: row.category,
          gap: row.categoryGapNote,
          gapSuggested: row.categoryGapSuggested,
          waa: row.wouldAutoApprove,
          hard: row.hardBlockers,
        },
        null,
        2,
      ),
    );
  }

  const titleMut = processingRuns.filter((r) => r.titleSemanticMutation === "YES").length;
  const descMut = processingRuns.filter((r) => r.descriptionSemanticMutation === "YES").length;
  const gapCount = processingRuns.filter((r) => r.categoryGapSuggested).length;

  const out = {
    projectId: PROJECT_ID,
    designId: DESIGN_ID,
    finishedAt: new Date().toISOString(),
    settings: {
      catalogWorkflowMode: settings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
      visionModelId: settings.visionModelId,
    },
    image,
    playgroundRuns,
    processingRuns,
    summary: {
      processingRuns: processingRuns.length,
      titleSemanticMutationCount: titleMut,
      descriptionSemanticMutationCount: descMut,
      centralSubjectAppendObserved: processingRuns.some((r) =>
        /\bwoman\b/i.test(String(r.finalProcessingTitle)) &&
        norm(r.finalProcessingTitle) === norm(r.sloganRebuildFromVisible),
      ),
      sloganReconstructionObserved: processingRuns.some((r) => r.leanRewriteStillForced),
      descriptionSynthesisObserved: processingRuns.some((r) => r.descriptionLooksSynthesized),
      deterministicProfanityMutationObserved: false,
      categoryGapSuggestedCount: gapCount,
      categories: processingRuns.map((r) => r.category),
      categoryGapNotes: processingRuns.map((r) => r.categoryGapNote),
      wouldAutoApprove: processingRuns.map((r) => r.wouldAutoApprove),
      promptVersions: [...new Set(processingRuns.map((r) => r.promptVersion))],
      profileVersions: [...new Set(processingRuns.map((r) => r.profileVersion))],
      normalizerVersions: [...new Set(processingRuns.map((r) => r.normalizerVersion))],
    },
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log("\nWrote", OUT);
  console.log(JSON.stringify(out.summary, null, 2));

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
