import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const serviceSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "printRequestService.ts"),
  "utf8",
);

test("printRequestService imports isPrintRequestOrigin for runtime requestOrigin mapping", () => {
  assert.match(
    serviceSource,
    /import\s*\{[^}]*\bisPrintRequestOrigin\b[^}]*\}\s*from\s*["']@fresh-prints\/shared\/utils\/printRequestOrigin["']/,
    "printRequestService must import isPrintRequestOrigin from the shared origin helper module",
  );
  assert.match(
    serviceSource,
    /requestOrigin:\s*isPrintRequestOrigin\(data\.requestOrigin\)/,
    "mapPrintRequestData must validate requestOrigin through isPrintRequestOrigin",
  );
});
