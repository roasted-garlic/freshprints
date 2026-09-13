import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Design Library Smart Profile local reconciliation contracts", () => {
  it("DesignLibraryPage defines handleSmartProfileUpdated with applyDesignPatch", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(source, /handleSmartProfileUpdated/);
    assert.match(source, /applyDesignPatch\(designId, \{ smartProfile \}\)/);
  });

  it("managed search path patches the visible managed-search list", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    const handlerBlock = source.slice(
      source.indexOf("const handleSmartProfileUpdated"),
      source.indexOf("const handleRestoreDesign"),
    );

    assert.match(handlerBlock, /managedSearchActive/);
    assert.match(handlerBlock, /applyManagedSearchPatch\(\{ \.\.\.current, smartProfile \}\)/);
  });

  it("selectedDesign is patched synchronously after Smart Profile save", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    const handlerBlock = source.slice(
      source.indexOf("const handleSmartProfileUpdated"),
      source.indexOf("const handleRestoreDesign"),
    );

    assert.match(handlerBlock, /setSelectedDesign\(\(prev\)/);
    assert.match(handlerBlock, /\{ \.\.\.prev, smartProfile \}/);
  });

  it("DesignDetailsModal wires parent reconciliation instead of modal-only override", () => {
    const modal = read(
      "apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx",
    );
    const page = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(modal, /onSmartProfileUpdated\?:/);
    assert.match(modal, /onSmartProfileUpdated\?\.\(design\.id, smartProfile\)/);
    assert.doesNotMatch(modal, /smartProfileOverride/);
    assert.match(page, /onSmartProfileUpdated=\{handleSmartProfileUpdated\}/);
  });

  it("Smart Profile section save and reset propagate through onProfileUpdated", () => {
    const section = read(
      "apps/studio/src/renderer/src/features/designs/components/DesignSmartProfileSection.tsx",
    );

    assert.match(section, /const result = await updateDesignSmartProfileDimensions/);
    assert.match(section, /onSaved\(result\.smartProfile\)/);
    assert.match(section, /const result = await resetDesignSmartProfileDimension/);
    assert.match(section, /onSaved=\{\(nextProfile\) => onProfileUpdated\?\.\(nextProfile\)\}/);
  });

  it("does not use refreshCatalog as the Smart Profile reconciliation primary fix", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    const handlerBlock = source.slice(
      source.indexOf("const handleSmartProfileUpdated"),
      source.indexOf("const handleRestoreDesign"),
    );

    assert.doesNotMatch(handlerBlock, /refreshCatalog/);
  });
});
