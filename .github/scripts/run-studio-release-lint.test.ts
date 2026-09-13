import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  compareDiagnostics,
  normalizeDiagnostic,
  parseLintJson,
  readBaseline,
  runReleaseLint,
} from "./run-studio-release-lint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(__dirname, "studio-release-lint-baseline.json");
const cwd = path.resolve(__dirname, "../..");

function baselineEntries() {
  return readBaseline(baselinePath, cwd);
}

function eslintJson(diagnostics: ReturnType<typeof baselineEntries>) {
  return JSON.stringify(
    diagnostics.map((diagnostic) => ({
      filePath: diagnostic.file,
      messages: [diagnostic],
    })),
  );
}

function fakeExecute(diagnostics: ReturnType<typeof baselineEntries>, status = 1) {
  return () => ({ status, stdout: eslintJson(diagnostics), stderr: "" });
}

test("reviewed baseline contains exactly 25 findings: 20 errors and 5 warnings", () => {
  const diagnostics = baselineEntries();
  assert.equal(diagnostics.length, 25);
  assert.equal(diagnostics.filter((diagnostic) => diagnostic.severity === 2).length, 20);
  assert.equal(diagnostics.filter((diagnostic) => diagnostic.severity === 1).length, 5);
});

test("exact baseline passes the release comparator", () => {
  const result = runReleaseLint({ cwd, baselinePath, execute: fakeExecute(baselineEntries()) });
  assert.equal(result.added.length, 0);
  assert.equal(result.removed.length, 0);
});

test("removing one baseline finding passes and reports an improvement", () => {
  const result = runReleaseLint({
    cwd,
    baselinePath,
    execute: fakeExecute(baselineEntries().slice(1)),
  });
  assert.equal(result.added.length, 0);
  assert.equal(result.removed.length, 1);
});

test("a new error fails the comparator", () => {
  const baseline = baselineEntries();
  const newError = { ...baseline[0], severity: 2, message: "new release regression" };
  const result = compareDiagnostics([...baseline, newError], baseline);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].message, "new release regression");
});

test("a new warning fails the comparator", () => {
  const baseline = baselineEntries();
  const newWarning = { ...baseline[0], severity: 1, message: "new release warning" };
  const result = compareDiagnostics([...baseline, newWarning], baseline);
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].message, "new release warning");
});

test("moved or changed diagnostics are treated as new", () => {
  const baseline = baselineEntries();
  const moved = { ...baseline[0], line: baseline[0].line + 1 };
  const changedMessage = { ...baseline[1], message: "changed baseline message" };
  const result = compareDiagnostics([moved, changedMessage], baseline);
  assert.equal(result.added.length, 2);
});

test("malformed ESLint JSON fails closed", () => {
  assert.throws(
    () => parseLintJson("{not-json", cwd),
    /ESLint JSON output is malformed/,
  );
});

test("ESLint process failure fails closed", () => {
  assert.throws(
    () => runReleaseLint({ cwd, baselinePath, execute: () => ({ status: 2, stdout: "[]", stderr: "boom" }) }),
    /ESLint process failed before comparison/,
  );
});

test("normalization is stable for Windows separators and sorting", () => {
  const normalized = normalizeDiagnostic(
    {
      filePath: `${cwd}\\apps\\studio\\src\\renderer\\src\\example.tsx`,
      severity: 2,
      ruleId: "example/rule",
      line: 1,
      column: 2,
      endLine: 1,
      endColumn: 3,
      message: "example",
    },
    cwd,
  );
  assert.equal(normalized.file, "apps/studio/src/renderer/src/example.tsx");
  const sorted = compareDiagnostics([normalized], [normalized]);
  assert.deepEqual(sorted.added, []);
});

test("comparator never changes the checked-in baseline", () => {
  const before = readFileSync(baselinePath, "utf8");
  runReleaseLint({ cwd, baselinePath, execute: fakeExecute(baselineEntries().slice(1)) });
  const after = readFileSync(baselinePath, "utf8");
  assert.equal(after, before);
});
