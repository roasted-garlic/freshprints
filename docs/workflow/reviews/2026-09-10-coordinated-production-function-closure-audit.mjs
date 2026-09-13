#!/usr/bin/env node

// Read-only, deterministic Function closure audit for the coordinated candidate.
// Run from the repository root (or from any directory):
//   node docs/workflow/reviews/2026-09-10-coordinated-production-function-closure-audit.mjs --summary

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../../..");
const functionsRoot = path.join(root, "functions", "src");
const sharedRoot = path.join(root, "packages", "shared", "src");

// Full production-source -> current-worktree runtime delta for the coordinated candidate.
// This deliberately includes committed development changes plus the dirty overlay, while excluding
// tests/specs and deleted paths that cannot participate in the current import closure.
function gitPathList(args) {
  return execFileSync("git", args, { encoding: "utf8", cwd: root })
    .split("\0")
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));
}

const candidateScopes = ["functions/src", "packages/shared/src"];
const changedRuntimePaths = [
  ...new Set([
    ...gitPathList(["diff", "--name-only", "-z", "origin/production", "--", ...candidateScopes]),
    ...gitPathList(["ls-files", "-z", "--others", "--exclude-standard", "--", ...candidateScopes]),
  ]),
]
  .filter((file) => fs.existsSync(path.join(root, file)))
  .filter((file) => !/\.(?:test|spec)\.[^.]+$/.test(file))
  .sort();

const excluded = new Set([
  "hardDeleteCustomerAccount",
  "previewHardDeleteCustomerAccount",
  "upsertDevFixtureShow",
  "inventoryCatalogImageStorage",
  "wipeOperationalTestData",
  "ownerDeleteUser",
  "rebuildTaxonomyMaterialization",
  "testAiEnrichmentPlayground",
  "testAiEnrichmentSemanticReviewPlayground",
  "backfillPrintRequestQueueTab",
]);

const noAction = new Set([
  "refreshSmartProfileVocabSnapshotScheduled",
  "onCatalogReprocessJobWritten",
  "previewCatalogReprocessJob",
  "startCatalogReprocessJob",
  "pauseCatalogReprocessJob",
  "resumeCatalogReprocessJob",
  "retryCatalogReprocessJobFailures",
  "resetDesignSmartProfileDimension",
  "updateSemanticReviewPlaygroundSetting",
]);

function parseExports(source) {
  const exports = [];
  for (const match of source.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g)) {
    for (const segment of match[1].split(",")) {
      const value = segment.trim().replace(/\/\/.*$/, "").trim();
      const parsed = value.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
      if (parsed) exports.push({ name: parsed[2] ?? parsed[1], module: match[2] });
    }
  }
  return exports;
}

function resolveLocal(fromFile, specifier) {
  let base;
  if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else if (specifier.startsWith("@fresh-prints/shared/")) {
    base = path.join(sharedRoot, specifier.slice("@fresh-prints/shared/".length));
  } else if (specifier === "@fresh-prints/shared") base = sharedRoot;
  else return null;

  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((ext) => base + ext),
    ...[".ts", ".tsx", ".js", ".jsx"].map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function importedSpecifiers(file) {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/(?:from|import\s*\(|require\s*\()\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

const currentExports = parseExports(fs.readFileSync(path.join(functionsRoot, "index.ts"), "utf8"));
const productionExports = parseExports(
  execFileSync("git", ["show", "origin/production:functions/src/index.ts"], { encoding: "utf8" }),
);
const productionNames = new Set(productionExports.map(({ name }) => name));
const changedIds = new Map(changedRuntimePaths.map((file, index) => [file, `F${String(index + 1).padStart(2, "0")}`]));
const closureCache = new Map();

function closureFor(moduleSpecifier) {
  const direct = resolveLocal(path.join(functionsRoot, "index.ts"), moduleSpecifier);
  if (!direct) return new Set();
  if (closureCache.has(direct)) return closureCache.get(direct);
  const closure = new Set();
  const pending = [direct];
  while (pending.length > 0) {
    const file = pending.pop();
    if (closure.has(file)) continue;
    closure.add(file);
    for (const specifier of importedSpecifiers(file)) {
      const local = resolveLocal(file, specifier);
      if (local && !closure.has(local)) pending.push(local);
    }
  }
  closureCache.set(direct, closure);
  return closure;
}

const allClosurePaths = new Set();
const counts = {};
const rows = currentExports.map(({ name, module }) => {
  const closure = closureFor(module);
  for (const file of closure) allClosurePaths.add(relative(file));
  const changed = [...closure]
    .map(relative)
    .filter((file) => changedIds.has(file))
    .sort((a, b) => Number(changedIds.get(a).slice(1)) - Number(changedIds.get(b).slice(1)))
    .map((file) => changedIds.get(file));
  const action = excluded.has(name)
    ? "EXCLUDE"
    : noAction.has(name)
      ? "NO ACTION"
      : !productionNames.has(name)
        ? "ADD"
        : changed.length > 0
          ? "UPDATE"
          : "RETAIN LIVE VERSION";
  counts[action] = (counts[action] ?? 0) + 1;
  return { export: name, directModule: module, closurePaths: closure.size, changedPathIds: changed, action };
});

const closureDigest = crypto
  .createHash("sha256")
  .update([...allClosurePaths].sort().join("\n") + "\n")
  .digest("hex");

const result = {
  currentExports: currentExports.length,
  productionExports: productionExports.length,
  uniqueLocalClosurePaths: allClosurePaths.size,
  sortedClosurePathSha256: closureDigest,
  actionCounts: counts,
  changedRuntimePaths: Object.fromEntries(changedIds),
  rows,
};

if (process.argv.includes("--summary")) {
  const { rows: _rows, changedRuntimePaths: _changedRuntimePaths, ...summary } = result;
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
