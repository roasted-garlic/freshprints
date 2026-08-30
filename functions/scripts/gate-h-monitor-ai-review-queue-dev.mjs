/**
 * Gate H — poll catalogReprocessJobs/{jobId} until terminal/paused; summarize outcomes.
 * Read-only after Start. Does not retry failures or Start again.
 *
 *   node functions/scripts/gate-h-monitor-ai-review-queue-dev.mjs <jobId>
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "fresh-prints-dev";
const jobId = process.argv[2];
if (!jobId) {
  console.error("Usage: node gate-h-monitor-ai-review-queue-dev.mjs <jobId>");
  process.exit(1);
}

const OUT_PATH = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_gate-h-monitor-ai-review-queue-dev-results.json",
);
const POLL_MS = Number(process.env.GATE_H_POLL_MS || 30000);
const MAX_MS = Number(process.env.GATE_H_MAX_MS || 8 * 60 * 60 * 1000);

function ensureAdmin() {
  if (getApps().length === 0) {
    initAdmin({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
  return getFirestore();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadOutcomes(db, id) {
  const snap = await db
    .collection("catalogReprocessJobs")
    .doc(id)
    .collection("outcomes")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function summarizeOutcomes(outcomes) {
  const byStatus = {};
  const failed = [];
  let wouldAutoApprove = 0;
  let verifierInvoked = 0;
  let verifierUnresolved = 0;
  let hardBlocked = 0;
  let categoryGap = 0;
  let subjectSpecificity = 0;
  let contextualSubject = 0;
  let titleValidation = 0;
  let remainedNeedsReview = 0;
  let anomaly = 0;
  let lifecycleOk = 0;
  let lifecycleBad = 0;

  for (const o of outcomes) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (o.status === "failed") {
      failed.push({
        designId: o.designId || o.id,
        errorCode: o.errorCode ?? null,
        errorMessage: typeof o.errorMessage === "string" ? o.errorMessage.slice(0, 300) : null,
      });
    }
    if (o.wouldAutoApprove === true) wouldAutoApprove += 1;
    if (o.verifierInvoked === true) verifierInvoked += 1;
    if (o.verifierOutcome === "unresolved") verifierUnresolved += 1;
    if (o.hardBlocked === true) hardBlocked += 1;
    if (o.categoryGap === true) categoryGap += 1;
    if (o.subjectSpecificityIssue === true) subjectSpecificity += 1;
    if (o.contextualSubjectIssue === true) contextualSubject += 1;
    if (o.titleValidationIssue === true) titleValidation += 1;
    if (o.remainedNeedsReview === true) remainedNeedsReview += 1;
    if (o.status === "anomaly") anomaly += 1;
    if (o.status === "succeeded") {
      if (o.finalStatus === "imported" && o.finalAiReviewStatus === "needs_review") {
        lifecycleOk += 1;
      } else {
        lifecycleBad += 1;
      }
    }
  }

  return {
    outcomeCount: outcomes.length,
    byStatus,
    wouldAutoApprove,
    verifierInvoked,
    verifierUnresolved,
    hardBlocked,
    categoryGap,
    subjectSpecificity,
    contextualSubject,
    titleValidation,
    remainedNeedsReview,
    anomaly,
    lifecycleOk,
    lifecycleBad,
    failed,
  };
}

function pickSampleCandidates(outcomes) {
  const succeeded = outcomes.filter((o) => o.status === "succeeded");
  const buckets = {
    wouldAutoApprove: succeeded.filter((o) => o.wouldAutoApprove === true),
    verifierUnresolved: succeeded.filter((o) => o.verifierOutcome === "unresolved"),
    verifierConfirmed: succeeded.filter((o) => o.verifierOutcome === "confirmed"),
    hardBlocked: succeeded.filter((o) => o.hardBlocked === true),
    categoryGap: succeeded.filter((o) => o.categoryGap === true),
    subjectSpecificity: succeeded.filter((o) => o.subjectSpecificityIssue === true),
    failed: outcomes.filter((o) => o.status === "failed"),
    anomaly: outcomes.filter((o) => o.status === "anomaly"),
  };
  const picks = [];
  for (const [label, list] of Object.entries(buckets)) {
    for (const item of list.slice(0, 3)) {
      picks.push({
        strata: label,
        designId: item.designId || item.id,
        status: item.status,
        wouldAutoApprove: item.wouldAutoApprove ?? null,
        verifierOutcome: item.verifierOutcome ?? null,
        hardBlocked: item.hardBlocked ?? null,
        promptVersion: item.promptVersion ?? null,
        normalizerVersion: item.normalizerVersion ?? null,
      });
    }
  }
  // Fill remaining from succeeded if under sample target
  const seen = new Set(picks.map((p) => p.designId));
  for (const o of succeeded) {
    if (picks.length >= 25) break;
    const id = o.designId || o.id;
    if (seen.has(id)) continue;
    seen.add(id);
    picks.push({
      strata: "succeeded_fill",
      designId: id,
      status: o.status,
      wouldAutoApprove: o.wouldAutoApprove ?? null,
      verifierOutcome: o.verifierOutcome ?? null,
      hardBlocked: o.hardBlocked ?? null,
      promptVersion: o.promptVersion ?? null,
      normalizerVersion: o.normalizerVersion ?? null,
    });
  }
  return picks;
}

async function main() {
  const db = ensureAdmin();
  const started = Date.now();
  let lastLog = "";

  while (Date.now() - started < MAX_MS) {
    const snap = await db.collection("catalogReprocessJobs").doc(jobId).get();
    if (!snap.exists) {
      throw new Error(`Job ${jobId} missing`);
    }
    const job = snap.data();
    const line = `${job.status} processed=${job.processed}/${job.totalEligible} ok=${job.succeeded} fail=${job.failed} skip=${job.skipped} anomaly=${job.anomalies ?? 0} cursor=${job.cursorDesignId ?? "-"} lastError=${job.lastError ?? "-"}`;
    if (line !== lastLog) {
      console.log(new Date().toISOString(), line);
      lastLog = line;
      writeFileSync(
        OUT_PATH,
        JSON.stringify(
          {
            jobId,
            projectId: PROJECT_ID,
            updatedAt: new Date().toISOString(),
            job,
            monitoring: true,
          },
          null,
          2,
        ),
      );
    }

    if (["completed", "failed", "paused", "cancelled"].includes(job.status)) {
      const outcomes = await loadOutcomes(db, jobId);
      const summary = summarizeOutcomes(outcomes);
      const settings =
        (await db.collection("settings").doc("aiEnrichment").get()).data() || {};

      // Spot-check: no successful outcome left ready
      let readyLeak = 0;
      for (const o of outcomes) {
        if (o.status === "succeeded" && (o.finalStatus === "ready" || o.finalAiReviewStatus === "approved")) {
          readyLeak += 1;
        }
      }

      const n = Math.max(summary.outcomeCount, 1);
      const eligible = job.totalEligible ?? 0;
      const sampleSize =
        eligible <= 25 ? eligible : eligible <= 100 ? 20 : eligible <= 500 ? 25 : 30;

      const result = {
        jobId,
        projectId: PROJECT_ID,
        finishedAt: new Date().toISOString(),
        finalJobState: job.status,
        jobCounters: {
          totalEligible: job.totalEligible ?? null,
          processed: job.processed ?? null,
          succeeded: job.succeeded ?? null,
          failed: job.failed ?? null,
          skipped: job.skipped ?? null,
          remainedNeedsReview: job.remainedNeedsReview ?? null,
          wouldAutoApprove: job.wouldAutoApprove ?? null,
          verifierInvoked: job.verifierInvoked ?? null,
          verifierUnresolved: job.verifierUnresolved ?? null,
          hardBlocked: job.hardBlocked ?? null,
          anomalies: job.anomalies ?? null,
          autoApproved: job.autoApproved ?? null,
          lastError: job.lastError ?? null,
          pauseRequested: job.pauseRequested === true,
          promptVersion: job.promptVersion ?? null,
          normalizerVersion: job.normalizerVersion ?? null,
          pipelineVersion: job.pipelineVersion ?? null,
          catalogWorkflowModeSnapshot: job.catalogWorkflowModeSnapshot ?? null,
          autonomousLiveEnabledSnapshot: job.autonomousLiveEnabledSnapshot ?? null,
        },
        outcomeSummary: summary,
        rates: {
          wouldAutoApproveRate: summary.wouldAutoApprove / n,
          verifierInvokedRate: summary.verifierInvoked / n,
          verifierUnresolvedRate: summary.verifierUnresolved / n,
          hardBlockedRate: summary.hardBlocked / n,
        },
        lifecycleCorruptionCheck: {
          readyLeakAmongSucceededOutcomes: readyLeak,
          lifecycleOk: summary.lifecycleOk,
          lifecycleBad: summary.lifecycleBad,
        },
        settingsAtEnd: {
          catalogWorkflowMode: settings.catalogWorkflowMode ?? null,
          catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
        },
        recommendedSampleSize: sampleSize,
        sampleCandidates: pickSampleCandidates(outcomes),
        monitoring: false,
      };
      writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
      console.log("TERMINAL", job.status);
      console.log(JSON.stringify(result.jobCounters, null, 2));
      return;
    }

    await sleep(POLL_MS);
  }

  throw new Error(`Monitor timed out after ${MAX_MS}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
