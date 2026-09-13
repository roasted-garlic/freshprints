import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sectionPath = join(here, "CatalogReprocessingSettingsSection.tsx");

describe("CatalogReprocessingSettingsSection Slice 5", () => {
  it("enables AI Review Preview/Start UX and keeps Ready Catalog unavailable", () => {
    const source = readFileSync(sectionPath, "utf8");
    assert.match(source, /Preview/);
    assert.match(source, /Confirmation phrase/);
    assert.match(source, /REPROCESS AI REVIEW QUEUE|requiredPhrase/);
    assert.match(source, /Start \(unavailable\)/);
    assert.match(source, /catalogWorkflowMode === "shadow"/);
    assert.match(source, /!catalogAutonomousLiveEnabled/);
  });
});
