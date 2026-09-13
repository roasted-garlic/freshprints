import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  getPrintRequestListTabsForKind,
  PRINT_REQUEST_LIST_TABS,
} from "../constants/printRequestRoutes";

const studioRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../../..");

describe("print request lifecycle tab layout contract", () => {
  it("renders five customer and four internal lifecycle tabs in order", () => {
    assert.deepEqual([...PRINT_REQUEST_LIST_TABS], [
      "working",
      "editing",
      "queued",
      "printing",
      "printed",
    ]);
    assert.deepEqual(getPrintRequestListTabsForKind("internal"), [
      "working",
      "editing",
      "queued",
      "printed",
    ]);
  });

  it("keeps lifecycle tab bar nowrap with overflow and label nowrap (no fixed widths)", () => {
    const css = readFileSync(
      join(studioRoot, "src/renderer/src/styles/components/show-queue.css"),
      "utf8",
    );
    const barStart = css.indexOf(".print-requests-tab-bar {");
    const buttonStart = css.indexOf(".print-requests-tab-button {");
    assert.ok(barStart >= 0);
    assert.ok(buttonStart >= 0);
    const barBlock = css.slice(barStart, buttonStart);
    const buttonBlock = css.slice(buttonStart, buttonStart + 450);

    assert.match(barBlock, /flex-wrap:\s*nowrap/);
    assert.match(barBlock, /overflow-x:\s*auto/);
    assert.doesNotMatch(barBlock, /flex-wrap:\s*wrap/);
    assert.match(buttonBlock, /white-space:\s*nowrap/);
    assert.doesNotMatch(buttonBlock, /width:\s*\d/);
    assert.doesNotMatch(buttonBlock, /min-width:\s*\d/);
  });
});
