import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static-source regression guard for the dedicated Companion Designs modal corrective:
 * `CompanionSetPanel` must live in its own "Companion Designs" modal, reached via a button below
 * "View more details" — never inside the compact `ModalBody` and never inside the secondary
 * Audit & Technical Details modal. This is a source-text assertion, not a runtime test, because
 * `DesignDetailsModal` is Electron-renderer code with heavy Firebase/auth dependencies that are
 * impractical to mount in a Node test runner.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(path.join(__dirname, relativePath), "utf8");
}

describe("DesignDetailsModal companion panel placement", () => {
  it("does not render CompanionSetPanel before the View more details button", () => {
    const source = readSource("DesignDetailsModal.tsx");
    const viewMoreDetailsButtonIndex = source.indexOf("View more details");
    const companionPanelIndex = source.indexOf("<CompanionSetPanel");

    assert.ok(viewMoreDetailsButtonIndex >= 0, 'Expected a "View more details" button in the source.');
    assert.ok(companionPanelIndex >= 0, "Expected <CompanionSetPanel to be rendered somewhere in the source.");
    assert.ok(
      companionPanelIndex > viewMoreDetailsButtonIndex,
      "CompanionSetPanel must not render before the View more details button (compact modal body).",
    );
  });

  it("renders a Companion Designs button directly below View more details, in the compact body", () => {
    const source = readSource("DesignDetailsModal.tsx");
    const viewMoreDetailsButtonIndex = source.indexOf("View more details");
    const companionButtonIndex = source.indexOf("Companion Designs");
    const compactModalBodyCloseIndex = source.indexOf("</ModalBody>");

    assert.ok(companionButtonIndex >= 0, 'Expected a "Companion Designs" button in the source.');
    assert.ok(
      companionButtonIndex > viewMoreDetailsButtonIndex,
      "Companion Designs button must render after (below) View more details.",
    );
    assert.ok(
      companionButtonIndex < compactModalBodyCloseIndex,
      "Companion Designs button must live in the compact modal body, alongside View more details.",
    );
  });

  it("does not render CompanionSetPanel inside the Audit & Technical Details modal", () => {
    const source = readSource("DesignDetailsModal.tsx");
    const auditModalStartIndex = source.indexOf('ariaLabelledBy="design-more-details-title"');
    const auditModalEndIndex = source.indexOf("</DesignLibraryModal>", auditModalStartIndex);
    const companionPanelIndex = source.indexOf("<CompanionSetPanel");

    assert.ok(auditModalStartIndex >= 0, "Expected the audit/more-details modal shell in the source.");
    assert.ok(auditModalEndIndex > auditModalStartIndex);
    assert.ok(
      companionPanelIndex < auditModalStartIndex || companionPanelIndex > auditModalEndIndex,
      "CompanionSetPanel must not render inside the Audit & Technical Details modal.",
    );
  });

  it("renders CompanionSetPanel inside its own dedicated Companion Designs modal", () => {
    const source = readSource("DesignDetailsModal.tsx");
    const companionModalStartIndex = source.indexOf('ariaLabelledBy="design-companion-designs-title"');
    const companionModalHeadingIndex = source.indexOf('id="design-companion-designs-title"');
    const companionModalEndIndex = source.indexOf("</DesignLibraryModal>", companionModalStartIndex);
    const companionPanelIndex = source.indexOf("<CompanionSetPanel");

    assert.ok(companionModalStartIndex >= 0, "Expected a dedicated Companion Designs modal shell in the source.");
    assert.ok(companionModalHeadingIndex > companionModalStartIndex);
    assert.ok(
      companionPanelIndex > companionModalHeadingIndex && companionPanelIndex < companionModalEndIndex,
      "CompanionSetPanel must render inside the dedicated Companion Designs modal.",
    );
  });

  it("keeps the compact Needs Companion header badge outside both secondary modals", () => {
    const source = readSource("DesignDetailsModal.tsx");
    const needsCompanionBadgeIndex = source.indexOf("Needs Companion");
    const moreDetailsModalIndex = source.indexOf('ariaLabelledBy="design-more-details-title"');
    const companionModalIndex = source.indexOf('ariaLabelledBy="design-companion-designs-title"');

    assert.ok(needsCompanionBadgeIndex >= 0, 'Expected a "Needs Companion" header badge in the source.');
    assert.ok(
      needsCompanionBadgeIndex < moreDetailsModalIndex && needsCompanionBadgeIndex < companionModalIndex,
      "Needs Companion header badge should stay in the compact header, before either secondary modal.",
    );
  });
});
