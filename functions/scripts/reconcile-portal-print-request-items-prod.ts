/**
 * Production-locked, one-page reconciler for portalPrintRequestItems.
 *
 * This file intentionally does not weaken or reuse the DEV project gate. It is safe by default:
 * DRY RUN and the read-only pre-APPLY VERIFY never write. Production APPLY requires two exact
 * confirmations and is never invoked by this repository workflow.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  reconcileBoundedPage,
  parsePageLimit,
  parseStartAfterItemId,
  type DryRunSummary,
  type RunMode,
} from "./backfill-portal-print-request-items-dev";

export const PROD_PROJECT_ID = "fresh-prints-prod";
export const PROD_CONFIRMATION = "CONFIRM_PROD_PORTAL_PROJECTION_APPLY";
export const DEFAULT_MANIFEST_PATH = "docs/workflow/reviews/2026-09-10-coordinated-production-commit-byte-manifest.json";
export const REQUIRED_MANIFEST_PATHS = [
  "firestore.rules",
  "firestore.transition.rules",
  "firestore.indexes.json",
  "storage.rules",
  "firebase.transition.json",
  "functions/scripts/reconcile-portal-print-request-items-prod.ts",
  "functions/src/lib/portalPrintRequestItemProjectionSync.ts",
  "packages/shared/src/utils/portalPrintRequestItemProjection.ts",
  "scripts/commit-byte-manifest.mjs",
  "apps/studio/package.json",
  "package-lock.json",
] as const;

export type VerificationExpectation =
  | "none"
  | "pre_apply_population_delta"
  | "post_apply_exact_equality"
  | "post_apply_zero_diff_dry_run";

export interface ProductionRunMode extends RunMode {
  expectation: VerificationExpectation;
}

export function resolveProductionProjectId(env: Record<string, string | undefined> = process.env): string {
  const projectId = (env.FIREBASE_PROJECT_ID ?? env.GCLOUD_PROJECT ?? "").trim();
  if (projectId !== PROD_PROJECT_ID) {
    throw new Error(`Refusing project "${projectId || "<missing>"}". This runner accepts only exactly "${PROD_PROJECT_ID}".`);
  }
  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_EMULATOR_HOST) {
    throw new Error("Production runner refuses emulator settings.");
  }
  return projectId;
}

export function parseProductionRunMode(
  env: Record<string, string | undefined> = process.env,
): ProductionRunMode {
  const apply = env.APPLY === "1";
  const verify = env.VERIFY === "1";
  const confirmation = env[PROD_CONFIRMATION] === "1";
  const stage = env.VERIFY_STAGE?.trim() || "pre_apply";
  const dryRunStage = env.DRY_RUN_STAGE?.trim() || "";

  if (apply && verify) throw new Error("VERIFY=1 cannot be combined with APPLY=1.");
  if (confirmation && !apply) throw new Error(`${PROD_CONFIRMATION}=1 requires APPLY=1.`);
  if (apply && !confirmation) throw new Error(`APPLY requires ${PROD_CONFIRMATION}=1.`);
  if (!apply && !verify && stage !== "pre_apply") {
    throw new Error("VERIFY_STAGE is only valid with VERIFY=1.");
  }
  if (apply && stage !== "pre_apply") {
    throw new Error("VERIFY_STAGE cannot be combined with APPLY=1.");
  }
  if (!apply && !verify && dryRunStage !== "" && dryRunStage !== "post_apply") {
    throw new Error('DRY_RUN_STAGE must be "post_apply" when provided.');
  }
  if ((apply || verify) && dryRunStage) {
    throw new Error("DRY_RUN_STAGE is only valid for a non-VERIFY dry run.");
  }
  if (verify && stage !== "pre_apply" && stage !== "post_apply") {
    throw new Error('VERIFY_STAGE must be "pre_apply" or "post_apply".');
  }

  return {
    apply,
    verify,
    dryRun: !apply,
    expectation: apply
      ? "none"
      : verify && stage === "post_apply"
        ? "post_apply_exact_equality"
        : verify
          ? "pre_apply_population_delta"
          : dryRunStage === "post_apply"
            ? "post_apply_zero_diff_dry_run"
            : "none",
  };
}

export function requireCandidateSha(env: Record<string, string | undefined> = process.env): string {
  const sha = (env.CANDIDATE_SHA ?? "").trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error("CANDIDATE_SHA must be an explicit 40-character lowercase commit SHA.");
  }
  return sha;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function gitBlob(sha: string, path: string): Buffer {
  return execFileSync("git", ["show", `${sha}:${path}`], { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
}

interface CandidateManifestEntry {
  sha256?: unknown;
  bytes?: unknown;
  byteLength?: unknown;
  path?: unknown;
}

interface CandidateManifest {
  candidateSha?: unknown;
  commitSha?: unknown;
  files?: Record<string, CandidateManifestEntry> | CandidateManifestEntry[];
}

/** Accept both the object-shaped generator output and the audited array-shaped parent manifest. */
export function normalizeCandidateManifest(manifest: CandidateManifest): {
  candidateSha: string;
  files: Map<string, { sha256: string; bytes: number }>;
} {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Candidate byte manifest must be an object.");
  }
  const candidateSha =
    typeof manifest.candidateSha === "string"
      ? manifest.candidateSha
      : typeof manifest.commitSha === "string"
        ? manifest.commitSha
        : "";
  if (!/^[0-9a-f]{40}$/.test(candidateSha)) {
    throw new Error("Candidate byte manifest must contain a full lowercase candidate SHA.");
  }
  const files = new Map<string, { sha256: string; bytes: number }>();
  if (Array.isArray(manifest.files)) {
    for (const entry of manifest.files) {
      const path = typeof entry?.path === "string" ? entry.path : "";
      if (!path || files.has(path)) throw new Error("Candidate byte manifest contains a duplicate or invalid path.");
      const bytes = entry.bytes ?? entry.byteLength;
      if (typeof entry.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.sha256)
        || typeof bytes !== "number" || !Number.isInteger(bytes) || bytes < 0) {
        throw new Error(`Candidate byte manifest entry is invalid: ${path || "<missing>"}`);
      }
      files.set(path, { sha256: entry.sha256, bytes });
    }
  } else if (manifest.files && typeof manifest.files === "object") {
    for (const [path, entry] of Object.entries(manifest.files)) {
      const bytes = entry?.bytes ?? entry?.byteLength;
      if (!entry || typeof entry.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.sha256)
        || typeof bytes !== "number" || !Number.isInteger(bytes) || bytes < 0) {
        throw new Error(`Candidate byte manifest entry is invalid: ${path}`);
      }
      files.set(path, { sha256: entry.sha256, bytes });
    }
  }
  if (files.size === 0) throw new Error("Candidate byte manifest contains no files.");
  return { candidateSha, files };
}

export function assertCleanCandidateBinding(
  env: Record<string, string | undefined> = process.env,
  gitRunner: (args: string[]) => string = git,
): string {
  const sha = requireCandidateSha(env);
  try {
    gitRunner(["cat-file", "-e", `${sha}^{commit}`]);
  } catch {
    throw new Error("CANDIDATE_SHA does not resolve to a commit.");
  }
  const head = gitRunner(["rev-parse", "HEAD"]);
  if (head !== sha) throw new Error(`CANDIDATE_SHA ${sha} does not match checked-out HEAD ${head}.`);
  if (gitRunner(["status", "--porcelain", "--untracked-files=all"])) {
    throw new Error("Production runner requires a clean worktree.");
  }

  const manifestPath = resolve(env.CANDIDATE_MANIFEST ?? DEFAULT_MANIFEST_PATH);
  if (!existsSync(manifestPath)) throw new Error(`Candidate byte manifest is missing: ${manifestPath}`);
  let manifest: CandidateManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as CandidateManifest;
  } catch {
    throw new Error("Candidate byte manifest is not valid JSON.");
  }
  const normalizedManifest = normalizeCandidateManifest(manifest);
  if (normalizedManifest.candidateSha !== sha) throw new Error("Candidate byte manifest SHA does not match CANDIDATE_SHA.");
  for (const path of REQUIRED_MANIFEST_PATHS) {
    const entry = normalizedManifest.files.get(path);
    if (!entry) {
      throw new Error(`Candidate byte manifest is missing required member: ${path}`);
    }
    let bytes: Buffer;
    try {
      bytes = gitBlob(sha, path);
    } catch {
      throw new Error(`Candidate byte manifest member is missing from Git: ${path}`);
    }
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (entry.bytes !== bytes.byteLength || entry.sha256 !== actualHash) {
      throw new Error(`Candidate byte manifest hash mismatch: ${path}`);
    }
  }
  return sha;
}

type ReconcileDb = Parameters<typeof reconcileBoundedPage>[0]["db"];

export async function runProductionPage(input: {
  db: ReconcileDb;
  projectId: string;
  mode: ProductionRunMode;
  pageLimit: number;
  startAfterItemId: string;
}): Promise<DryRunSummary> {
  if (input.projectId !== PROD_PROJECT_ID) throw new Error("runProductionPage requires fresh-prints-prod.");
  if (input.mode.expectation === "pre_apply_population_delta") {
    // Pre-APPLY VERIFY is deliberately a dry, delta-reporting comparison. Missing/stale rows are
    // expected here; malformed/unsafe rows still fail closed before an APPLY checkpoint.
    const summary = await reconcileBoundedPage({
      db: input.db,
      projectId: input.projectId,
      mode: { apply: false, verify: false, dryRun: true },
      pageLimit: input.pageLimit,
      startAfterItemId: input.startAfterItemId,
    });
    if (summary.errors > 0) throw new Error(`Pre-APPLY VERIFY failed with ${summary.errors} unsafe/malformed row(s).`);
    return summary;
  }

  const summary = await reconcileBoundedPage({
    db: input.db,
    projectId: input.projectId,
    mode: input.mode,
    pageLimit: input.pageLimit,
    startAfterItemId: input.startAfterItemId,
  });
  if (input.mode.expectation === "post_apply_exact_equality" && (summary.errors > 0 || summary.create > 0 || summary.update > 0)) {
    throw new Error("Post-APPLY VERIFY failed exact equality.");
  }
  if (input.mode.expectation === "post_apply_zero_diff_dry_run" && (summary.errors > 0 || summary.create > 0 || summary.update > 0)) {
    throw new Error("Post-APPLY DRY RUN failed zero-diff convergence.");
  }
  return summary;
}

async function main(): Promise<void> {
  const env = process.env;
  const projectId = resolveProductionProjectId(env);
  const mode = parseProductionRunMode(env);
  const candidateSha = assertCleanCandidateBinding(env);
  const pageLimit = parsePageLimit(env);
  const startAfterItemId = parseStartAfterItemId(env);

  const scriptPath = fileURLToPath(import.meta.url);
  const functionsRoot = resolve(scriptPath, "..", "..");
  const require = createRequire(resolve(functionsRoot, "package.json"));
  const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app") as {
    initializeApp: (options: { credential: unknown; projectId: string }) => unknown;
    applicationDefault: () => unknown;
    getApps: () => unknown[];
  };
  const { getFirestore } = require("firebase-admin/firestore") as { getFirestore: () => ReconcileDb };
  if (getApps().length === 0) initializeApp({ credential: applicationDefault(), projectId });

  const summary = await runProductionPage({
    db: getFirestore(),
    projectId,
    mode,
    pageLimit,
    startAfterItemId,
  });
  console.log(JSON.stringify({
    candidateSha,
    mode: mode.expectation === "none" ? (mode.apply ? "apply" : "dry_run") : mode.expectation,
    ...summary,
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
