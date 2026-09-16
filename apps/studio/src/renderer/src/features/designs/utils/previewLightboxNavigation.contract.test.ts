import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const studioFeaturesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readStudioSource(...segments: string[]): string {
  return readFileSync(path.join(studioFeaturesRoot, ...segments), "utf8");
}

describe("previewLightboxNavigation Studio caller contracts", () => {
  it("Print Requests lightbox navigation uses item.id, not designId alone", () => {
    const lightbox = readStudioSource(
      "print-requests",
      "components",
      "PrintRequestItemsPreviewLightbox.tsx",
    );
    const card = readStudioSource("print-requests", "components", "PrintRequestItemCard.tsx");
    const page = readStudioSource("print-requests", "pages", "PrintRequestsPage.tsx");

    assert.match(lightbox, /Stable navigation id is always `item\.id`/);
    assert.match(lightbox, /id: item\.id/);
    assert.doesNotMatch(
      lightbox,
      /activeItemId=\{[^}]*designId/,
      "lightbox must not key active id from designId",
    );
    assert.match(card, /data-print-request-item-id=\{item\.id\}/);
    assert.match(page, /setLightboxItemId\(item\.id\)/);
    assert.match(lightbox, /data-print-request-item-id=/);
  });

  it("request-selection lightbox nav does not call onAdd/onRemove/onQuantityChange", () => {
    const grid = readStudioSource("designs", "components", "DesignGrid.tsx");
    const card = readStudioSource("designs", "components", "DesignSelectionCard.tsx");

    assert.match(grid, /onActiveItemChange=\{setLightboxDesignId\}/);
    assert.match(grid, /DesignPreviewLightbox/);
    assert.doesNotMatch(
      grid,
      /onActiveItemChange=\{\(.*?\)\s*=>\s*\{[\s\S]*onAdd/,
      "lightbox active change must not invoke requestSelection.onAdd",
    );
    assert.doesNotMatch(
      grid,
      /onActiveItemChange=\{\(.*?\)\s*=>\s*\{[\s\S]*onRemove/,
      "lightbox active change must not invoke requestSelection.onRemove",
    );
    assert.doesNotMatch(
      grid,
      /onActiveItemChange=\{\(.*?\)\s*=>\s*\{[\s\S]*onQuantityChange/,
      "lightbox active change must not invoke requestSelection.onQuantityChange",
    );
    assert.doesNotMatch(card, /DesignPreviewLightbox/);
    assert.match(card, /onOpenPreview/);
    assert.match(card, /must not mutate selection membership\/qty/);
  });

  it("AI Review lightbox navigation selects designs without autoAdvance/approve/reject", () => {
    const workspace = readStudioSource("ai-review", "components", "AiReviewWorkspace.tsx");
    const page = readStudioSource("ai-review", "pages", "AiReviewPage.tsx");

    assert.match(workspace, /onActiveItemChange=\{onSelectDesign\}/);
    assert.match(workspace, /visibleDesigns/);
    assert.match(page, /onSelectDesign=\{inbox\.requestSelectDesign\}/);
    assert.match(page, /visibleDesigns=\{inbox\.designs\}/);

    const lightboxBlockStart = workspace.indexOf("<DesignPreviewLightbox");
    assert.ok(lightboxBlockStart >= 0);
    const lightboxBlock = workspace.slice(lightboxBlockStart, lightboxBlockStart + 500);
    assert.doesNotMatch(lightboxBlock, /autoAdvance/);
    assert.doesNotMatch(lightboxBlock, /onApprove/);
    assert.doesNotMatch(lightboxBlock, /onReject/);
    assert.doesNotMatch(lightboxBlock, /onAutoAdvanceChange/);
  });

  it("DesignPreviewLightbox guards ArrowLeft/ArrowRight with editable target helper", () => {
    const lightbox = readStudioSource("designs", "components", "DesignPreviewLightbox.tsx");

    assert.match(lightbox, /isPreviewLightboxEditableKeyboardTarget/);
    assert.match(lightbox, /ArrowLeft/);
    assert.match(lightbox, /ArrowRight/);
    assert.match(lightbox, /event\.preventDefault\(\)/);
    assert.match(lightbox, /positionLabel/);
    assert.match(lightbox, /design-preview-lightbox-position/);
  });

  it("intake list uses ArrowUp/ArrowDown for selection, not lightbox vertical aliases", () => {
    const lightbox = readStudioSource("designs", "components", "DesignPreviewLightbox.tsx");
    const intake = readStudioSource(
      "customer-uploads",
      "components",
      "CustomerUploadIntakeSection.tsx",
    );

    assert.doesNotMatch(lightbox, /enableVerticalNavigation/);
    assert.doesNotMatch(intake, /enableVerticalNavigation/);
    assert.match(intake, /event\.key !== "ArrowUp" && event\.key !== "ArrowDown"/);
    assert.match(intake, /getPreviewLightboxNavigationState\(listItemIds, intake\.selectedId\)/);
    assert.match(intake, /isPreviewLightboxEditableKeyboardTarget/);
    assert.match(intake, /data-customer-upload-intake-id=\{row\.id\}/);
    assert.match(intake, /intake\.setSelectedId\(nextId\)/);
    assert.match(intake, /document\.querySelector\("\.modal-overlay"\)/);
    assert.match(intake, /previewNavigationItems/);
    assert.match(intake, /onActiveItemChange=\{intake\.setSelectedId\}/);
    assert.match(intake, /isLightboxOpen && Boolean\(selectedPreviewItem\)/);
    assert.match(intake, /onOpenPreview=/);
  });

  it("Design Library browse wires filteredDesigns continuous selection and final scroll ref", () => {
    const details = readStudioSource("designs", "components", "DesignDetailsModal.tsx");
    const page = readStudioSource("designs", "pages", "DesignLibraryPage.tsx");

    assert.match(details, /previewNavigationDesigns/);
    assert.match(details, /onPreviewNavigate/);
    assert.match(details, /onActiveItemChange=\{onPreviewNavigate\}/);
    assert.match(page, /handlePreviewNavigate/);
    assert.match(page, /filteredDesigns\.find/);
    assert.match(page, /pendingScrollDesignIdRef\.current = selectedDesign\.id/);
    assert.match(page, /previewNavigationDesigns=\{/);
  });

  it("Design Details adds modal navigation without replacing the existing lightbox", () => {
    const details = readStudioSource("designs", "components", "DesignDetailsModal.tsx");
    const css = readFileSync(
      path.resolve(studioFeaturesRoot, "../styles/components/design-library.css"),
      "utf8",
    );

    assert.match(details, /getPreviewLightboxNavigationState/);
    assert.match(details, /aria-label="Previous design"/);
    assert.match(details, /aria-label="Next design"/);
    assert.match(details, /onPreviewNavigate\?\.\(detailsNavigationState\.previousId\)/);
    assert.match(details, /onPreviewNavigate\?\.\(detailsNavigationState\.nextId\)/);
    assert.match(details, /<DesignPreviewLightbox/);
    assert.match(css, /\.design-details-modal-navigation/);
    assert.match(css, /\.design-details-modal-navigation-button--previous/);
    assert.match(css, /\.design-details-modal-navigation-button--next/);
    assert.match(css, /\.design-details-modal-navigation-position/);
  });

  it("Companion, intake, and batch import wire continuous or local+close nav collections", () => {
    const companion = readStudioSource("designs", "components", "CompanionSetPanel.tsx");
    const intake = readStudioSource(
      "customer-uploads",
      "components",
      "CustomerUploadIntakeSection.tsx",
    );
    const batch = readStudioSource("imports", "components", "batch", "BatchImportFileList.tsx");

    assert.match(companion, /onActiveItemChange=\{handleLightboxActiveItemChange\}/);
    assert.match(companion, /setLightboxMember\(nextMember\)/);
    assert.match(intake, /onActiveItemChange=\{intake\.setSelectedId\}/);
    assert.match(intake, /previewNavigationItems/);
    assert.match(intake, /isLightboxOpen && Boolean\(selectedPreviewItem\)/);
    assert.match(batch, /id: file\.filePath/);
    assert.match(batch, /onActiveItemChange=\{setLightboxFilePath\}/);
    assert.match(batch, /data-batch-import-file-path/);
  });
});
