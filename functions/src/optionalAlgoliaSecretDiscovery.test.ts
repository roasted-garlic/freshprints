/**
 * Regression: optional Algolia admin secret must not enter Firebase Functions
 * deployment discovery (`declaredParams`) via the default export graph or via
 * unrelated Functions that import shared `lib/secrets`.
 *
 * Each case runs in a fresh Node child against compiled `lib/` so module cache
 * cannot leak params across scenarios (matches Firebase discovery: one process
 * load of the entry). Requires `npm run build` in `functions/` first.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const functionsRoot = path.resolve(testDir, "..");
const compiledSrcRoot = path.join(functionsRoot, "lib", "functions", "src");

function compiledEntry(relFromSrc: string): string {
  const abs = path.join(compiledSrcRoot, relFromSrc.replace(/\.ts$/, ".js"));
  if (!fs.existsSync(abs)) {
    throw new Error(
      `Missing compiled entry ${abs}. Run \`npm run build\` in functions/ before this test.`,
    );
  }
  return abs;
}

function declaredSecretNames(relFromSrc: string): string[] {
  const entry = compiledEntry(relFromSrc).replace(/\\/g, "/");
  const code = `
const { clearParams, declaredParams } = require("firebase-functions/params");
clearParams();
require(${JSON.stringify(entry)});
const names = declaredParams
  .filter((p) => typeof p.toSpec === "function" && p.toSpec().type === "secret")
  .map((p) => p.name);
process.stdout.write(JSON.stringify(names));
`;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: functionsRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `discovery child failed (status=${result.status}):\n${result.stderr || result.stdout}`,
    );
  }
  const stdout = (result.stdout || "").trim();
  const jsonLine = stdout.split(/\r?\n/).filter(Boolean).at(-1) ?? "[]";
  return JSON.parse(jsonLine) as string[];
}

test("default Functions index discovery does not register ALGOLIA_ADMIN_API_KEY", () => {
  const names = declaredSecretNames("index.js");
  assert.ok(!names.includes("ALGOLIA_ADMIN_API_KEY"), `secrets=${names.join(",")}`);
});

test("enqueueAiEnrichment discovery does not register ALGOLIA_ADMIN_API_KEY", () => {
  const names = declaredSecretNames("enqueueAiEnrichment.js");
  assert.ok(!names.includes("ALGOLIA_ADMIN_API_KEY"), `secrets=${names.join(",")}`);
  assert.ok(names.includes("GEMINI_API_KEY"), "expected GEMINI_API_KEY from shared secrets");
  assert.ok(names.includes("RESEND_API_KEY"), "expected RESEND_API_KEY from shared secrets");
  assert.ok(names.includes("BREVO_API_KEY"), "expected BREVO_API_KEY from shared secrets");
  assert.ok(names.includes("ETSY_X_API_KEY"), "expected ETSY_X_API_KEY from shared secrets");
});

test("Algolia-specific module discovery registers ALGOLIA_ADMIN_API_KEY", () => {
  const names = declaredSecretNames("algolia/syncPortalCatalogDesignToAlgolia.js");
  assert.ok(names.includes("ALGOLIA_ADMIN_API_KEY"), `secrets=${names.join(",")}`);
  assert.equal(
    names.filter((n) => n === "ALGOLIA_ADMIN_API_KEY").length,
    1,
    "Algolia admin secret should register once",
  );
});

test("shared lib/secrets discovery does not register ALGOLIA_ADMIN_API_KEY", () => {
  const names = declaredSecretNames("lib/secrets.js");
  assert.ok(!names.includes("ALGOLIA_ADMIN_API_KEY"), `secrets=${names.join(",")}`);
  assert.ok(names.includes("GEMINI_API_KEY"));
});
