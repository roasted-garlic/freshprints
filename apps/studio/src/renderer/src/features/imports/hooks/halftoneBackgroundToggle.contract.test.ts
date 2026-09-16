import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("import session Halftone changes seed the paired session background", () => {
  const source = readFileSync(path.join(__dirname, "useImportSessionSettings.ts"), "utf8");
  assert.match(
    source,
    /halftoneMode === "all_halftones" \? "all_dark" : "auto"/,
  );
});

test("single and batch import Halftone changes seed independent item background overrides", () => {
  const singleSource = readFileSync(path.join(__dirname, "useSinglePngImport.ts"), "utf8");
  const batchSource = readFileSync(path.join(__dirname, "useBatchImport.ts"), "utf8");

  assert.match(singleSource, /itemBackgroundOverride: itemHalftoneOverride === "on" \? "dark" : "auto"/);
  assert.match(batchSource, /\[filePath\]: value === "on" \? "dark" : "auto"/);
  assert.match(singleSource, /setItemBackgroundOverride/);
  assert.match(batchSource, /setItemBackgroundOverride/);
});
