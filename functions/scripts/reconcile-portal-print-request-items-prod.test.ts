import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Timestamp } from "firebase/firestore";

import {
  PROD_CONFIRMATION,
  PROD_PROJECT_ID,
  REQUIRED_MANIFEST_PATHS,
  assertCleanCandidateBinding,
  normalizeCandidateManifest,
  parseProductionRunMode,
  resolveProductionProjectId,
  runProductionPage,
} from "./reconcile-portal-print-request-items-prod";

function memoryDb() {
  const canonical: Record<string, Record<string, unknown>> = {
    "item-1": {
      printRequestId: "request-1",
      sourceType: "catalog_design",
      designId: "design-1",
      quantity: 1,
      status: "pending",
      addedBy: "customer-1",
      createdAt: Timestamp.fromMillis(1_000),
      updatedAt: Timestamp.fromMillis(2_000),
    },
  };
  const projections: Record<string, Record<string, unknown>> = {};
  let writes = 0;
  const dataFor = (name: string) => name === "printRequestItems" ? canonical : projections;
  const db = {
    collection(name: string) {
      const data = dataFor(name);
      return {
        doc(id: string) {
          const ref = { __collection: name, id };
          return {
            ...ref,
            async get() { return { id, exists: Boolean(data[id]), data: () => data[id], ref }; },
          };
        },
        orderBy(field: string) {
          assert.equal(field, "__name__");
          let startAfter = "";
          let limit = 0;
          const query = {
            orderBy(next: string) { assert.equal(next, "__name__"); return query; },
            limit(count: number) { limit = count; return query; },
            startAfter(cursor: { id: string }) { startAfter = cursor.id; return query; },
            async get() {
              const ids = Object.keys(data).sort().filter((id) => id > startAfter).slice(0, limit);
              return { empty: ids.length === 0, size: ids.length, docs: ids.map((id) => ({ id, exists: true, data: () => data[id], ref: { __collection: name, id } })) };
            },
          };
          return query;
        },
      };
    },
    async runTransaction<T>(fn: (tx: { get: (ref: { __collection: string; id: string }) => Promise<{ id: string; exists: boolean; data: () => Record<string, unknown> | undefined; ref: unknown }>; set: (ref: { __collection: string; id: string }, value: Record<string, unknown>) => void }) => Promise<T>) {
      return fn({
        async get(ref) { const data = dataFor(ref.__collection); return { id: ref.id, exists: Boolean(data[ref.id]), data: () => data[ref.id], ref }; },
        set(ref, value) { writes += 1; dataFor(ref.__collection)[ref.id] = value; },
      });
    },
  };
  return { db, get writes() { return writes; } };
}

test("production runner requires the exact production project and rejects emulator settings", () => {
  assert.equal(resolveProductionProjectId({ FIREBASE_PROJECT_ID: PROD_PROJECT_ID }), PROD_PROJECT_ID);
  assert.throws(() => resolveProductionProjectId({ FIREBASE_PROJECT_ID: "fresh-prints-dev" }), /fresh-prints-prod/);
  assert.throws(() => resolveProductionProjectId({ FIREBASE_PROJECT_ID: PROD_PROJECT_ID, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }), /emulator/);
});

test("default and pre-APPLY VERIFY modes are read-only population-delta modes", () => {
  assert.deepEqual(parseProductionRunMode({}), { apply: false, verify: false, dryRun: true, expectation: "none" });
  assert.deepEqual(parseProductionRunMode({ VERIFY: "1" }), {
    apply: false,
    verify: true,
    dryRun: true,
    expectation: "pre_apply_population_delta",
  });
  assert.throws(() => parseProductionRunMode({ APPLY: "1" }), /CONFIRM_PROD/);
  assert.throws(() => parseProductionRunMode({ VERIFY: "1", APPLY: "1" }), /cannot be combined/);
  assert.throws(() => parseProductionRunMode({ VERIFY: "1", VERIFY_STAGE: "unknown" }), /VERIFY_STAGE/);
  assert.throws(() => parseProductionRunMode({ APPLY: "1", [PROD_CONFIRMATION]: "1", VERIFY_STAGE: "post_apply" }), /cannot be combined/);
});

test("APPLY needs both exact confirmations and post-APPLY VERIFY is distinct", () => {
  assert.deepEqual(parseProductionRunMode({ APPLY: "1", [PROD_CONFIRMATION]: "1" }), {
    apply: true,
    verify: false,
    dryRun: false,
    expectation: "none",
  });
  assert.deepEqual(parseProductionRunMode({ VERIFY: "1", VERIFY_STAGE: "post_apply" }).expectation, "post_apply_exact_equality");
  assert.deepEqual(parseProductionRunMode({ DRY_RUN_STAGE: "post_apply" }).expectation, "post_apply_zero_diff_dry_run");
  assert.throws(() => parseProductionRunMode({ [PROD_CONFIRMATION]: "1" }), /requires APPLY/);
});

test("source contract names all three verification expectations", () => {
  const source = readFileSync(new URL("./reconcile-portal-print-request-items-prod.ts", import.meta.url), "utf8");
  assert.match(source, /pre_apply_population_delta/);
  assert.match(source, /post_apply_exact_equality/);
  assert.match(source, /zero-diff|zero diff/i);
  assert.match(source, /summary\.errors > 0/);
});

test("candidate manifest normalization accepts the parent audit shape and requires cutover bytes", () => {
  const normalized = normalizeCandidateManifest({
    commitSha: "a".repeat(40),
    files: [
      { path: "firestore.rules", byteLength: 1, sha256: "b".repeat(64) },
      { path: "firestore.transition.rules", byteLength: 2, sha256: "c".repeat(64) },
    ],
  });
  assert.equal(normalized.candidateSha, "a".repeat(40));
  assert.equal(normalized.files.get("firestore.rules")?.bytes, 1);
  assert.ok(REQUIRED_MANIFEST_PATHS.includes("functions/scripts/reconcile-portal-print-request-items-prod.ts"));
  assert.ok(REQUIRED_MANIFEST_PATHS.includes("scripts/commit-byte-manifest.mjs"));
  assert.throws(
    () => normalizeCandidateManifest({ candidateSha: "a".repeat(40), files: [{ path: "x", bytes: 1, sha256: "bad" }] }),
    /entry is invalid/,
  );
});

test("pre-APPLY VERIFY reports missing rows, while post-APPLY VERIFY and DRY RUN prove convergence", async () => {
  const store = memoryDb();
  const pre = await runProductionPage({
    db: store.db,
    projectId: PROD_PROJECT_ID,
    mode: parseProductionRunMode({ VERIFY: "1" }),
    pageLimit: 1,
    startAfterItemId: "",
  });
  assert.equal(pre.create, 1);
  assert.equal(store.writes, 0);

  await assert.rejects(
    runProductionPage({ db: store.db, projectId: PROD_PROJECT_ID, mode: { apply: false, verify: true, dryRun: true, expectation: "post_apply_exact_equality" }, pageLimit: 1, startAfterItemId: "" }),
    /VERIFY failed/,
  );

  const applied = await runProductionPage({ db: store.db, projectId: PROD_PROJECT_ID, mode: { apply: true, verify: false, dryRun: false, expectation: "none" }, pageLimit: 1, startAfterItemId: "" });
  assert.equal(applied.actualWrites, 1);
  const post = await runProductionPage({ db: store.db, projectId: PROD_PROJECT_ID, mode: parseProductionRunMode({ VERIFY: "1", VERIFY_STAGE: "post_apply" }), pageLimit: 1, startAfterItemId: "" });
  assert.equal(post.alreadyCorrect, 1);
  const zeroDiff = await runProductionPage({ db: store.db, projectId: PROD_PROJECT_ID, mode: parseProductionRunMode({ DRY_RUN_STAGE: "post_apply" }), pageLimit: 1, startAfterItemId: "" });
  assert.equal(zeroDiff.create + zeroDiff.update + zeroDiff.errors, 0);
});

test("candidate binding requires a clean exact SHA and required byte manifest members", () => {
  const sha = "a".repeat(40);
  const calls: string[][] = [];
  const fakeGit = (args: string[]) => {
    calls.push(args);
    if (args[0] === "rev-parse") return sha;
    if (args[0] === "status") return "";
    return "ok";
  };
  assert.throws(
    () => assertCleanCandidateBinding({ CANDIDATE_SHA: sha, CANDIDATE_MANIFEST: "missing.json" }, fakeGit),
    /manifest is missing/,
  );
  assert.ok(calls.some((args) => args[0] === "cat-file"));
});
