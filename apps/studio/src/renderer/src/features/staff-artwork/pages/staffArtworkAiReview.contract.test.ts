import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("Studio Staff Artwork AI Review promotion contracts", () => {
  const source = read(
    "apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx",
  );
  const service = read(
    "apps/studio/src/renderer/src/features/staff-artwork/services/staffArtworkService.ts",
  );
  const server = read("functions/src/staffArtwork.ts");

  it("keeps AI multiple selection separate from Print Request selection", () => {
    assert.match(source, /isAiMultiSelectMode/);
    assert.match(source, /canBulkPromote = canManage && !selectionMode/);
    assert.match(source, /selectedAiArtworkIds/);
    assert.match(source, /Multiple Select/);
    assert.match(source, /Send to AI/);
    assert.doesNotMatch(source, /Send to AI Review/);
    assert.match(source, /try only the failures/);
  });

  it("uses the existing per-item promotion and non-forced Auto-process queue", () => {
    assert.match(source, /staffArtworkService\.promote\(user, artworkId\)/);
    assert.match(source, /enqueueImportedDesignsForBackgroundAi\(\[promoted\.designId\]\)/);
    assert.doesNotMatch(source, /enqueueImportedDesignsForBackgroundAi\(\[.*\],\s*\{\s*force:\s*true/);
    assert.match(source, /artwork\.status !== "ready"/);
    assert.match(source, /promoted\.alreadyPromoted/);
    assert.match(source, /runAiReviewBulkReprocess/);
  });

  it("makes the whole eligible card the AI selection target and suppresses preview behavior", () => {
    assert.match(source, /aria-pressed=/);
    assert.match(source, /role=\{isAiMultiSelectMode && aiSelectable \? "button"/);
    assert.match(source, /tabIndex=\{isAiMultiSelectMode && aiSelectable \? 0 : undefined\}/);
    assert.match(source, /event\.key !== "Enter" && event\.key !== " "/);
    assert.match(source, /toggleAiArtworkSelection\(artwork\.id\)/);
    assert.match(source, /if \(isAiMultiSelectMode\) \{[\s\S]*setLightboxArtworkId/);
    assert.match(source, /event\.stopPropagation\(\);/);
    assert.match(source, /canManage && !selectionMode && !isAiMultiSelectMode/);
    assert.match(source, /is-ai-selected/);
  });

  it("keeps artwork still on an active show out of AI selection with an apparent reason", () => {
    assert.match(source, /describeStaffArtworkActiveShowBlockNotice/);
    assert.match(source, /aiSelectable =[\s\S]*!deleteBlocked/);
    assert.match(source, /staff-artwork-ai-show-block-help/);
    assert.match(source, /About artwork on an active show/);
    assert.match(
      source,
      /Still on an active show or print request — remove it or wait until that show is/,
    );
    assert.match(source, /On Active Show/);
    assert.doesNotMatch(source, /staff-artwork-card-block-notice/);
    assert.match(source, /disabled=\{isRemoving \|\| isPromoting \|\| deleteBlocked\}/);
    assert.match(source, /Artwork still on an active show or print request cannot be selected/);
  });

  it("keeps bulk and single promotion on one callable payload and exposes safe failure diagnostics", () => {
    assert.match(service, /httpsCallable[\s\S]*promoteStaffArtworkToAiReview/);
    assert.match(service, /call\(\{ staffArtworkId \}\)/);
    assert.match(service, /resolveStaffArtworkCallableErrorMessage/);
    assert.match(server, /reason: "deletion_blockers"/);
    assert.match(server, /recordState: promotionRecordState/);
    assert.match(server, /throw failedPrecondition\(message, details\)/);
    assert.match(server, /where\("sourceStaffArtworkId", "==", id\)/);
    assert.match(server, /const linkedDesignId = existing \|\| linkedDesignSnapshot/);
    assert.match(server, /getStaffArtworkPreviewStoragePath\(id\)/);
    assert.match(server, /getStaffArtworkThumbnailStoragePath\(id\)/);
  });

  it("uses bounded cursor pagination and resets through the list hook", () => {
    const hook = read(
      "apps/studio/src/renderer/src/features/staff-artwork/hooks/useStaffArtworkList.ts",
    );
    assert.match(service, /limit\(pageSize \+ 1\)/);
    assert.match(service, /orderBy\("createdAt", "desc"\)/);
    assert.match(service, /orderBy\("__name__", "desc"\)/);
    assert.match(service, /startAfter\(/);
    assert.doesNotMatch(service, /listWithoutCompositeIndex/);
    assert.match(hook, /isLoadingMore/);
    assert.match(hook, /loadMore/);
    assert.match(hook, /nextCursorRef/);
    assert.match(hook, /reload/);
    assert.match(source, /useStaffArtworkList\(user, filterCustomerId\)/);
    assert.match(source, /Load more/);
  });

  it("keeps AI Review on canonical Design derivative paths", () => {
    assert.match(server, /getPreviewStoragePath\(designId\)/);
    assert.match(server, /getThumbnailStoragePath\(designId\)/);
    const workspace = read(
      "apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx",
    );
    const queue = read(
      "apps/studio/src/renderer/src/features/ai-review/components/AiReviewQueueList.tsx",
    );
    assert.match(workspace, /selectedDesign\?\.previewPath \?\? selectedDesign\?\.thumbnailPath/);
    assert.match(queue, /catalogPath=\{design\.thumbnailPath\}/);
    assert.doesNotMatch(`${workspace}\n${queue}`, /staff-artwork|staffArtworks/);
  });
});
