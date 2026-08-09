import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Assisted catalog-share artwork background wiring", () => {
  it("trusted suggest callable builds snapshots from design doc via shared helper", () => {
    const source = read("functions/src/assistedCreationRequests.ts");
    assert.match(source, /buildAssistedCatalogShareArtworkBackgroundSnapshots/);
    assert.match(source, /designData\.artworkBackgroundHex/);
    assert.doesNotMatch(source, /data\.artworkBackgroundHex/);
    assert.match(source, /catalogArtworkBackgroundHex/);
  });

  it("Studio picker and share/proof UI pass resolved artworkBackgroundHex", () => {
    const picker = read(
      "apps/studio/src/renderer/src/features/customer-requests/components/AssistedCatalogDesignPickerModal.tsx",
    );
    const section = read(
      "apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx",
    );
    assert.match(picker, /artworkBackgroundHex=\{design\.artworkBackgroundHex\}/);
    assert.match(section, /resolveAssistedCatalogShareArtworkBackgroundHex/);
    assert.match(section, /needsAssistedCatalogShareArtworkBackgroundLiveResolve/);
    assert.match(section, /getDesignById/);
  });

  it("Portal catalog-share surfaces use shared resolver + bounded getReadyDesignsByIds", () => {
    const status = read(
      "apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx",
    );
    const detail = read(
      "apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx",
    );
    assert.match(status, /resolveAssistedCatalogShareArtworkBackgroundHex/);
    assert.match(status, /getReadyDesignsByIds/);
    assert.doesNotMatch(status, /onSnapshot\(/);
    assert.match(detail, /AssistedCreationProofsPanel/);
    assert.match(detail, /listArtworkBackgroundHex|liveListArtworkBackgroundHex/);
    assert.match(detail, /getReadyDesignsByIds/);
    assert.doesNotMatch(detail, /onSnapshot\(/);
  });

  it("Studio suggest client sends designId only — never client hex", () => {
    const section = read(
      "apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx",
    );
    assert.match(
      section,
      /await assistedCreationRequestsService\.suggestCatalogDesign\(\{\s*requestId: item\.id,\s*designId,\s*\}\)/,
    );
    const suggestCall = section.match(
      /assistedCreationRequestsService\.suggestCatalogDesign\(\{[\s\S]*?\}\)/,
    )?.[0];
    assert.ok(suggestCall);
    assert.doesNotMatch(suggestCall, /artworkBackgroundHex/);
  });
});
