/**
 * Slice 5 Gate I corrective — post-deploy mini QA (fresh-prints-dev ONLY).
 * Targeted re-enrich via enqueueAiEnrichment. No bulk reprocess. Leaves new profiles
 * in place (imported + needs_review under Shadow) for owner inspection.
 *
 *   $env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
 *   node functions/scripts/gate-i-corrective-mini-qa-dev.mjs
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-dev";
const OUT_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_gate-i-corrective-mini-qa-dev-results.json",
);

const RUN_ID = Date.now().toString(36);
const PASSWORD = `MiniQA30-${randomBytes(18).toString("base64url")}!aA1`;

/** Max 10 designs — Gate I failure classes only. */
const FIXTURES = [
  {
    id: "yJm2VBRvecPNjx79aSnK",
    qaClass: "good-specificity",
    label: "Highland cow",
    prior: "C1 fixture — must keep highland cow",
  },
  {
    id: "5Jype5Zc1b13XXSci5Kn",
    qaClass: "good-specificity",
    label: "Miniature schnauzer",
    prior: "Gate I PASS — schnauzer dog",
  },
  {
    id: "51Oz02NfLY8vTruauW56",
    qaClass: "good-specificity",
    label: "Frankenstein's monster",
    prior: "Gate I PASS — specific subject",
  },
  {
    id: "6zKWIvQyvwH5M19bCeYW",
    qaClass: "artificial-glue",
    label: "problem skeleton",
    prior: "Gate I PASS WITH NOTES — problem skeleton compound",
  },
  {
    id: "3QNubh7l7WahljYYfgYe",
    qaClass: "artificial-glue",
    label: "coochie alligator",
    prior: "Gate I PASS WITH NOTES — coochie alligator compound",
  },
  {
    id: "2Nj95YLaLk6763oTrRZw",
    qaClass: "artificial-glue",
    label: "donald goofy",
    prior: "Gate I PASS WITH NOTES — donald goofy merge",
  },
  {
    id: "9bR7JWSWwv94Ofb7byC3",
    qaClass: "unsupported-subject",
    label: "MJ glove/mic person",
    prior: "Gate I FAIL PROFILE — unsupported person; verifier blocked",
  },
  {
    id: "8m0KgJEel8kLpYlmZpFb",
    qaClass: "ambiguous-creature",
    label: "Ambiguous companions",
    prior: "Gate I FAIL PROFILE — noisy dog/creature subjects; verifier blocked",
  },
  {
    id: "5NVU91SMRiecLkZqdrN8",
    qaClass: "category-false-positive",
    label: "Fantasy book / Floral & Nature",
    prior: "Gate I FAIL AUTOMATION — Floral & Nature + shadow_would_auto_approve",
  },
  {
    id: "20fv9qb9gRLSB66nS3xp",
    qaClass: "text-driven-empty-subject",
    label: "Jesus saves / I spend",
    prior: "Gate I PASS — empty subjects OK",
  },
];

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

function ensureAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID || PROJECT_ID;
  if (projectId !== PROJECT_ID) {
    throw new Error(`FIREBASE_PROJECT_ID must be ${PROJECT_ID}`);
  }
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }
  return getFirestore();
}

function summarizeProfile(data) {
  const sp = data?.smartProfile ?? {};
  const prov = sp.provenance ?? {};
  const reasons = Array.isArray(prov.automationReasonCodes) ? prov.automationReasonCodes : [];
  return {
    status: data?.status ?? null,
    aiReviewStatus: data?.aiReviewStatus ?? null,
    title: data?.title ?? null,
    categoryId: data?.categoryId ?? data?.aiSuggestions?.categoryId ?? null,
    categoryName: data?.categoryName ?? data?.aiSuggestions?.categoryName ?? null,
    promptVersion: prov.promptVersion ?? null,
    normalizerVersion: prov.normalizerVersion ?? null,
    subjects: Array.isArray(sp.subjects) ? sp.subjects : [],
    themes: Array.isArray(sp.themes) ? sp.themes : [],
    interests: Array.isArray(sp.interests) ? sp.interests : [],
    searchConcepts: Array.isArray(sp.searchConcepts) ? sp.searchConcepts : [],
    places: Array.isArray(sp.places) ? sp.places : [],
    categoryAlternatives: sp.categoryAlternatives ?? [],
    categoryGapSuggested: sp.categoryGapSuggested === true,
    automationDecision: prov.automationDecision ?? null,
    automationReasonCodes: reasons,
    verifierInvoked: prov.verifierInvoked === true,
    wouldAutoApprove: reasons.includes("shadow_would_auto_approve"),
  };
}

function subjectsLower(summary) {
  return (summary.subjects ?? []).map((s) => String(s).toLowerCase());
}

function evaluateFixture(fixture, after) {
  const s = subjectsLower(after);
  const reasons = after.automationReasonCodes ?? [];
  const notes = [];
  let verdict = "PASS";

  const provenanceOk =
    after.promptVersion === "catalog-enrich-v30" &&
    after.normalizerVersion === "smart-profile-normalizer-v4";
  if (!provenanceOk) {
    return {
      verdict: "FAIL",
      notes: [`provenance expected v30/v4 got ${after.promptVersion}/${after.normalizerVersion}`],
      checks: { provenanceOk },
    };
  }

  const lifecycleOk =
    after.status === "imported" && after.aiReviewStatus === "needs_review" && after.status !== "ready";
  if (!lifecycleOk) {
    return {
      verdict: "FAIL",
      notes: [`lifecycle anomaly status=${after.status} aiReviewStatus=${after.aiReviewStatus}`],
      checks: { provenanceOk, lifecycleOk },
    };
  }

  const checks = { provenanceOk, lifecycleOk };

  switch (fixture.qaClass) {
    case "good-specificity": {
      if (fixture.id === "yJm2VBRvecPNjx79aSnK") {
        checks.hasHighlandCow = s.some((x) => x === "highland cow" || x.includes("highland cow"));
        if (!checks.hasHighlandCow) {
          verdict = "FAIL";
          notes.push("missing highland cow specificity");
        }
      } else if (fixture.id === "5Jype5Zc1b13XXSci5Kn") {
        checks.hasSchnauzer = s.some((x) => x.includes("schnauzer"));
        if (!checks.hasSchnauzer) {
          verdict = "FAIL";
          notes.push("missing schnauzer specificity");
        }
      } else if (fixture.id === "51Oz02NfLY8vTruauW56") {
        checks.hasFrankenstein = s.some((x) => x.includes("frankenstein"));
        if (!checks.hasFrankenstein) {
          verdict = "FAIL";
          notes.push("missing Frankenstein specificity");
        }
      }
      const artificial = s.filter((x) =>
        /problem skeleton|coochie alligator|bath skeleton|f-caw-f|donald goofy/.test(x),
      );
      checks.noArtificialCompound = artificial.length === 0;
      if (!checks.noArtificialCompound) {
        verdict = "FAIL";
        notes.push(`unexpected artificial: ${artificial.join(", ")}`);
      }
      break;
    }
    case "artificial-glue": {
      const banned = [
        "problem skeleton",
        "coochie alligator",
        "bath skeleton",
        "donald goofy",
      ];
      const found = banned.filter((b) => s.includes(b) || s.some((x) => x === b));
      const fCaw = s.filter((x) => /f-caw-f|fcawf/.test(x));
      checks.noArtificialCompound = found.length === 0 && fCaw.length === 0;
      if (!checks.noArtificialCompound) {
        verdict = "FAIL";
        notes.push(`artificial still present: ${[...found, ...fCaw].join(", ")}`);
      }
      if (fixture.id === "6zKWIvQyvwH5M19bCeYW") {
        checks.hasSkeleton = s.includes("skeleton");
      }
      if (fixture.id === "3QNubh7l7WahljYYfgYe") {
        checks.hasAlligator = s.includes("alligator");
      }
      break;
    }
    case "unsupported-subject": {
      checks.notWouldAutoApprove = after.wouldAutoApprove !== true;
      checks.personBlocked =
        !s.includes("person") ||
        reasons.some((r) => r.includes("structured_evidence_gap:subjects:person")) ||
        after.wouldAutoApprove !== true;
      if (after.wouldAutoApprove === true && s.includes("person")) {
        verdict = "FAIL";
        notes.push("unsupported person reached shadow_would_auto_approve");
      } else if (after.wouldAutoApprove === true && !s.includes("person")) {
        // would-approve without person — notes only if profile otherwise risky
        notes.push("would-auto-approve without person subject — review category/profile manually");
        verdict = "PASS WITH NOTES";
      } else if (s.includes("person") && after.wouldAutoApprove !== true) {
        notes.push("person still emitted but unattended approval blocked");
        verdict = "PASS WITH NOTES";
      }
      break;
    }
    case "ambiguous-creature": {
      checks.notWouldAutoApprove = after.wouldAutoApprove !== true;
      const dogUnsafe =
        s.includes("dog") &&
        after.wouldAutoApprove === true &&
        !reasons.some((r) => r.includes("structured_evidence_gap"));
      if (dogUnsafe || after.wouldAutoApprove === true) {
        // Auto-approve on this ambiguous design is fail if dog present; even without dog, auto-approve may be notes
        if (s.includes("dog") && after.wouldAutoApprove === true) {
          verdict = "FAIL";
          notes.push("ambiguous dog reached would-auto-approve");
        } else if (after.wouldAutoApprove === true) {
          notes.push("would-auto-approve on previously noisy identity design — review");
          verdict = "PASS WITH NOTES";
        }
      }
      if (s.includes("dog") && after.wouldAutoApprove !== true) {
        notes.push("dog still present but blocked from unattended approval");
        if (verdict === "PASS") verdict = "PASS WITH NOTES";
      }
      break;
    }
    case "category-false-positive": {
      const floral =
        String(after.categoryName ?? "")
          .toLowerCase()
          .includes("floral") ||
        String(after.categoryName ?? "")
          .toLowerCase()
          .includes("nature");
      const unsafe = floral && after.wouldAutoApprove === true;
      checks.notUnsafeFloralAutoApprove = !unsafe;
      checks.hasConflictCode = reasons.includes("category_dominant_intent_conflict");
      if (unsafe) {
        verdict = "FAIL";
        notes.push("Floral/Nature + shadow_would_auto_approve still present");
      } else if (checks.hasConflictCode) {
        notes.push("category_dominant_intent_conflict fired as expected");
      } else if (!floral) {
        notes.push(`category now ${after.categoryName ?? "(none)"} — not Floral & Nature`);
      } else {
        notes.push("Floral/Nature retained but would-auto-approve denied (other blocker)");
        verdict = "PASS WITH NOTES";
      }
      break;
    }
    case "text-driven-empty-subject": {
      checks.emptyOrNoForcedSubject = (after.subjects ?? []).length === 0;
      if (!checks.emptyOrNoForcedSubject) {
        // Not necessarily fail if a legitimate subject appeared; note it
        notes.push(`subjects not empty: ${after.subjects.join(", ")}`);
        verdict = "PASS WITH NOTES";
      }
      break;
    }
    default:
      break;
  }

  return { verdict, notes, checks };
}

async function resetForEnqueue(db, designId) {
  await db.collection("designs").doc(designId).update({
    status: "imported",
    aiReviewStatus: "pending",
    aiProcessed: false,
    aiReviewed: false,
    aiProcessingStage: FieldValue.delete(),
    aiRequestedVisionModelId: FieldValue.delete(),
    aiRequestedReasoningEffort: FieldValue.delete(),
    aiSuggestions: FieldValue.delete(),
    aiAnalysis: FieldValue.delete(),
    smartProfile: FieldValue.delete(),
    aiReviewedAt: FieldValue.delete(),
    aiReviewedBy: FieldValue.delete(),
    aiReviewNotes: FieldValue.delete(),
    aiReviewConfidence: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function main() {
  const db = ensureAdmin();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error("Portal .env.local project mismatch");
  }

  const settingsSnap = await db.collection("settings").doc("aiEnrichment").get();
  const settings = settingsSnap.data() || {};
  const catalogWorkflowMode = settings.catalogWorkflowMode ?? null;
  const catalogAutonomousLiveEnabled = settings.catalogAutonomousLiveEnabled === true;

  const activeJobs = await db
    .collection("catalogReprocessJobs")
    .where("status", "in", ["pending", "running", "paused"])
    .limit(5)
    .get();

  const results = {
    projectId: PROJECT_ID,
    startedAt: new Date().toISOString(),
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
    readyCatalogLocked: true,
    activeReprocessJobs: activeJobs.size,
    fixtures: [],
    aborted: false,
  };

  if (catalogAutonomousLiveEnabled) {
    results.aborted = true;
    results.abortReason = "catalogAutonomousLiveEnabled is ON";
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (catalogWorkflowMode !== "shadow") {
    results.aborted = true;
    results.abortReason = `expected shadow mode, got ${catalogWorkflowMode}`;
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }
  if (activeJobs.size > 0) {
    results.aborted = true;
    results.abortReason = `active reprocess jobs present: ${activeJobs.docs.map((d) => d.id).join(",")}`;
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    throw new Error(results.abortReason);
  }

  const email = `mini-qa-v30-${RUN_ID}@freshprints.local`;
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
    displayName: `Mini QA v30 ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

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
  const enqueue = httpsCallable(getFunctions(app, "us-central1"), "enqueueAiEnrichment");

  try {
    for (const fixture of FIXTURES) {
      const ref = db.collection("designs").doc(fixture.id);
      const beforeSnap = await ref.get();
      if (!beforeSnap.exists) {
        results.fixtures.push({ ...fixture, outcome: "missing", verdict: "FAIL" });
        console.log(`MISSING ${fixture.id}`);
        continue;
      }
      const before = summarizeProfile(beforeSnap.data());
      console.log(`\n=== ${fixture.qaClass} ${fixture.label} ${fixture.id}`);
      console.log("RESET + ENQUEUE");
      await resetForEnqueue(db, fixture.id);
      let callError = null;
      let callData = null;
      try {
        const callResult = await enqueue({ designId: fixture.id });
        callData = callResult.data ?? null;
      } catch (err) {
        callError = String(err?.message ?? err);
        console.error("ENQUEUE FAILED", callError);
      }

      // Poll briefly if still pending
      let afterData = (await ref.get()).data() || {};
      for (let i = 0; i < 12; i += 1) {
        if (afterData.smartProfile?.provenance?.promptVersion) break;
        await new Promise((r) => setTimeout(r, 5000));
        afterData = (await ref.get()).data() || {};
        console.log(`  wait ${i + 1}/12 stage=${afterData.aiProcessingStage} review=${afterData.aiReviewStatus}`);
      }

      const after = summarizeProfile(afterData);
      const evaluation = callError
        ? { verdict: "FAIL", notes: [`enqueue error: ${callError}`], checks: {} }
        : evaluateFixture(fixture, after);

      const row = {
        ...fixture,
        outcome: callError ? "enqueue_failed" : "enriched",
        before,
        after,
        callableData: callData,
        evaluation,
        verdict: evaluation.verdict,
      };
      results.fixtures.push(row);
      console.log(
        JSON.stringify(
          {
            id: fixture.id,
            verdict: evaluation.verdict,
            notes: evaluation.notes,
            promptVersion: after.promptVersion,
            normalizerVersion: after.normalizerVersion,
            subjects: after.subjects,
            categoryName: after.categoryName,
            wouldAutoApprove: after.wouldAutoApprove,
            reasons: after.automationReasonCodes,
            status: after.status,
            aiReviewStatus: after.aiReviewStatus,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await db.collection("users").doc(user.uid).delete().catch(() => {});
    await authAdmin.deleteUser(user.uid).catch(() => {});
  }

  const verdicts = results.fixtures.map((f) => f.verdict);
  results.completedAt = new Date().toISOString();
  results.counts = {
    total: results.fixtures.length,
    pass: verdicts.filter((v) => v === "PASS").length,
    passWithNotes: verdicts.filter((v) => v === "PASS WITH NOTES").length,
    fail: verdicts.filter((v) => v === "FAIL").length,
  };
  if (results.counts.fail > 0) {
    results.overallVerdict = "FAIL";
    results.recommendation = "NEEDS ADDITIONAL CORRECTIVE";
  } else if (results.counts.passWithNotes > 0) {
    results.overallVerdict = "PASS WITH NOTES";
    results.recommendation = "READY FOR SLICE 5 SIGNOFF REVIEW";
  } else {
    results.overallVerdict = "PASS";
    results.recommendation = "READY FOR SLICE 5 SIGNOFF REVIEW";
  }

  writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log("\nWROTE " + OUT_JSON);
  console.log("OVERALL=" + results.overallVerdict);
  console.log("RECOMMENDATION=" + results.recommendation);
  if (results.overallVerdict === "FAIL") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
