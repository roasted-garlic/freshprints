import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sectionPath = join(here, "CatalogReprocessingSettingsSection.tsx");

describe("CatalogReprocessingSettingsSection Slice 6", () => {
  it("supports Ready Preview/Start when gate enabled and keeps unavailable state", () => {
    const source = readFileSync(sectionPath, "utf8");
    assert.match(source, /ready_catalog/);
    assert.match(source, /readyInventory/);
    assert.match(source, /Canary design IDs/);
    assert.match(source, /Start \(unavailable\)/);
    assert.match(source, /catalogWorkflowMode === "shadow"/);
    assert.match(source, /!catalogAutonomousLiveEnabled/);
  });
});
