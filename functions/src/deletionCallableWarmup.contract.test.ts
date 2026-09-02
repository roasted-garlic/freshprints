import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("deletion callable same-service warmup contracts", () => {
  const printRequest = read("functions/src/deleteEligiblePrintRequest.ts");
  const upcomingShow = read("functions/src/deleteEligibleUpcomingShow.ts");
  const customerUpload = read("functions/src/deleteEligibleCustomerUpload.ts");
  const unapprovedDesign = read("functions/src/deleteEligibleUnapprovedDesign.ts");
  const hardDelete = read("functions/src/hardDeleteCustomerAccount.ts");
  const purge = read("functions/src/purgeArchivedDesignAssets.ts");

  it("uses shared warmup helpers (no standalone ping Function export)", () => {
    const index = read("functions/src/index.ts");
    assert.doesNotMatch(index, /pingDeletion|warmDeletionServices|warmupDeletion/);
    for (const source of [
      printRequest,
      upcomingShow,
      customerUpload,
      unapprovedDesign,
      hardDelete,
      purge,
    ]) {
      assert.match(source, /isDeletionCallableWarmupRequest/);
      assert.match(source, /deletionWarmupOk/);
    }
  });

  it("warmup runs only after auth + role assert and before entity mutation/preview work", () => {
    assert.match(
      printRequest,
      /assertOwnerCaller\(caller\);\s*if \(isDeletionCallableWarmupRequest\(request\.data\)\)/,
    );
    assert.match(
      upcomingShow,
      /assertOwnerCaller\(caller\);\s*if \(isDeletionCallableWarmupRequest\(request\.data\)\)/,
    );
    assert.match(
      customerUpload,
      /assertCanDeleteCustomerUpload\(caller\);\s*if \(isDeletionCallableWarmupRequest\(request\.data\)\)/,
    );
    assert.match(
      unapprovedDesign,
      /assertOwnerCaller\(caller\);\s*if \(isDeletionCallableWarmupRequest\(request\.data\)\)/,
    );
    assert.match(
      hardDelete,
      /assertOwnerCaller\(caller\);\s*if \(isDeletionCallableWarmupRequest\(request\.data\)\)/,
    );
    assert.match(
      purge,
      /assertOwnerCaller\(caller\);\s*if \(isDeletionCallableWarmupRequest\(request\.data\)\)/,
    );
    const handlerStart = purge.indexOf("export const purgeArchivedDesignAssets");
    const handler = purge.slice(handlerStart);
    const warmupIdx = handler.indexOf("isDeletionCallableWarmupRequest");
    const purgeCallIdx = handler.indexOf("await purgeOneDesign(");
    assert.ok(warmupIdx >= 0 && purgeCallIdx > warmupIdx);
  });

  it("purge warmup returns before validate/purge and does not invoke Storage helpers in handler", () => {
    const handlerStart = purge.indexOf("export const purgeArchivedDesignAssets");
    const handler = purge.slice(handlerStart);
    assert.match(
      handler,
      /if \(isDeletionCallableWarmupRequest\(request\.data\)\) \{\s*return deletionWarmupOk\(\);/,
    );
    const warmupReturn = handler.indexOf("return deletionWarmupOk()");
    const validateIdx = handler.indexOf("validatePurgeArchivedDesignAssetsRequest");
    assert.ok(warmupReturn >= 0 && validateIdx > warmupReturn);
    assert.doesNotMatch(handler, /deleteLargeDesignAssets\(/);
  });

  it("warmup path does not call buildPreview / executeEligibleHardDelete / deleteOneDesign", () => {
    assert.match(
      printRequest,
      /if \(isDeletionCallableWarmupRequest\(request\.data\)\) \{\s*return deletionWarmupOk\(\);/,
    );
    assert.match(
      upcomingShow,
      /if \(isDeletionCallableWarmupRequest\(request\.data\)\) \{\s*return deletionWarmupOk\(\);/,
    );
    assert.match(
      customerUpload,
      /if \(isDeletionCallableWarmupRequest\(request\.data\)\) \{\s*return deletionWarmupOk\(\);/,
    );
  });

  it("print-request preview parallelizes independent dependency reads", () => {
    assert.match(
      printRequest,
      /Promise\.all\(\[\s*loadAllocationBlockers\(printRequestId\),\s*loadItemHardDeleteBlockers\(printRequestId\),\s*\]\)/,
    );
    assert.match(printRequest, /Promise\.all\(\s*labelTargets\.map/);
  });

  it("upcoming-show mutate uses a single server-side buildPreview recheck", () => {
    const mutateStart = upcomingShow.indexOf("export const deleteEligibleUpcomingShow");
    const mutateBody = upcomingShow.slice(mutateStart);
    const buildPreviewCalls = mutateBody.match(/await buildPreview\(/g) ?? [];
    assert.equal(buildPreviewCalls.length, 1);
    assert.match(mutateBody, /const recheck = await buildPreview/);
  });
});
