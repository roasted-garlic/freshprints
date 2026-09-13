import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ESLINT_BIN = path.join(path.dirname(require.resolve("eslint")), "..", "bin", "eslint.js");
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const BASELINE_PATH = path.join(
  REPO_ROOT,
  ".github",
  "scripts",
  "studio-release-lint-baseline.json",
);

function normalizeFile(filePath, cwd = REPO_ROOT) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
  return path.relative(cwd, absolute).replaceAll("\\", "/").replace(/^\.\//, "");
}

export function normalizeDiagnostic(message, cwd = REPO_ROOT) {
  return {
    file: normalizeFile(message.filePath ?? message.file ?? "", cwd),
    severity: message.severity,
    ruleId: message.ruleId ?? null,
    line: message.line ?? null,
    column: message.column ?? null,
    endLine: message.endLine ?? null,
    endColumn: message.endColumn ?? null,
    message: message.message ?? "",
  };
}

export function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) => {
    const leftKey = JSON.stringify(left);
    const rightKey = JSON.stringify(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

export function diagnosticKey(diagnostic) {
  return JSON.stringify(diagnostic);
}

export function diagnosticsFromResults(results, cwd = REPO_ROOT) {
  return sortDiagnostics(
    results.flatMap((result) =>
      (result.messages ?? []).map((message) => normalizeDiagnostic({ ...message, filePath: result.filePath }, cwd)),
    ),
  );
}

export function parseLintJson(stdout, cwd = REPO_ROOT) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`ESLint JSON output is malformed: ${error.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("ESLint JSON output must be an array");
  }
  return diagnosticsFromResults(parsed, cwd);
}

export function readBaseline(baselinePath = BASELINE_PATH, cwd = REPO_ROOT) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch (error) {
    throw new Error(`Lint baseline cannot be read or parsed: ${error.message}`);
  }
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.diagnostics)) {
    throw new Error("Lint baseline schema is invalid");
  }
  const diagnostics = manifest.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic, cwd));
  const sorted = sortDiagnostics(diagnostics);
  if (JSON.stringify(diagnostics) !== JSON.stringify(sorted)) {
    throw new Error("Lint baseline diagnostics are not deterministically sorted");
  }
  const keys = new Set(diagnostics.map(diagnosticKey));
  if (keys.size !== diagnostics.length) {
    throw new Error("Lint baseline contains duplicate diagnostics");
  }
  return diagnostics;
}

export function compareDiagnostics(current, baseline) {
  const currentKeys = new Set(current.map(diagnosticKey));
  const baselineKeys = new Set(baseline.map(diagnosticKey));
  return {
    current: sortDiagnostics(current),
    baseline: sortDiagnostics(baseline),
    added: sortDiagnostics(current.filter((diagnostic) => !baselineKeys.has(diagnosticKey(diagnostic)))),
    removed: sortDiagnostics(baseline.filter((diagnostic) => !currentKeys.has(diagnosticKey(diagnostic)))),
  };
}

export function executeEslint(cwd = REPO_ROOT) {
  return spawnSync(
    process.execPath,
    [
      ESLINT_BIN,
      ".",
      "--ext",
      "ts,tsx",
      "--report-unused-disable-directives",
      "--format",
      "json",
    ],
    { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024 },
  );
}

export function runReleaseLint({ cwd = REPO_ROOT, baselinePath = BASELINE_PATH, execute = executeEslint } = {}) {
  const baseline = readBaseline(baselinePath, cwd);
  const result = execute(cwd);
  if (result.error || result.status === null || result.status > 1) {
    throw new Error(`ESLint process failed before comparison (status ${result.status ?? "null"})`);
  }
  const current = parseLintJson(result.stdout ?? "", cwd);
  const comparison = compareDiagnostics(current, baseline);
  return { ...comparison, eslintStatus: result.status ?? 0, stderr: result.stderr ?? "" };
}

function formatDiagnostic(diagnostic) {
  const location = diagnostic.line === null ? "" : `:${diagnostic.line}:${diagnostic.column}`;
  return `${diagnostic.file}${location} [${diagnostic.ruleId ?? "unknown"}] ${diagnostic.message}`;
}

export function main(options = {}) {
  try {
    const result = runReleaseLint(options);
    console.log(
      `Studio release lint baseline: current=${result.current.length} baseline=${result.baseline.length} ` +
        `new=${result.added.length} removed=${result.removed.length}`,
    );
    if (result.removed.length > 0) {
      console.log("Baseline findings removed:");
      result.removed.forEach((diagnostic) => console.log(`- ${formatDiagnostic(diagnostic)}`));
    }
    if (result.added.length > 0) {
      console.error("New lint findings (baseline is never auto-expanded):");
      result.added.forEach((diagnostic) => console.error(`- ${formatDiagnostic(diagnostic)}`));
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`Studio release lint failed closed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main();
}
