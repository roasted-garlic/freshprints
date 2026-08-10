import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const servicePath = resolve(
  process.cwd(),
  "apps/studio/src/renderer/src/features/designs/services/companionSetService.ts",
);

function readService(): string {
  return readFileSync(servicePath, "utf8");
}

describe("companion pairwise link service wiring", () => {
  it("exposes the pairwise link/unlink/queue API", () => {
    const service = readService();

    assert.match(service, /async linkDesign\(/);
    assert.match(service, /async unlinkPair\(/);
    assert.match(service, /async markNeedsCompanion\(/);
    assert.match(service, /async clearNeedsCompanionUnlinked\(/);
    assert.match(service, /async listLinkedDesigns\(/);
  });

  it("drops the legacy transitive group-set API and fields", () => {
    const service = readService();

    assert.equal(/\bunlinkMember\b/.test(service), false);
    assert.equal(/\blistMemberDesigns\b/.test(service), false);
    assert.equal(/\bgetCompanionSet\(/.test(service), false);
    assert.equal(service.includes("memberDesignIds"), false);
    assert.equal(service.includes("resolveCompanionLinkCase"), false);
    assert.equal(service.includes("getCompanionSetsCollection"), false);
  });

  it("creates the canonical companionLinks/{minId_maxId} edge via buildCompanionLinkId and is idempotent when it already exists", () => {
    const service = readService();

    assert.match(service, /buildCompanionLinkId\(designAId, designBId\)/);
    const linkFnMatch = service.match(/async function linkDesignInTransaction[\s\S]*?\n}\n/);
    assert.ok(linkFnMatch, "Expected to find linkDesignInTransaction in the source.");
    assert.match(linkFnMatch[0], /linkSnapshot\.exists\(\)/);
  });

  it("heals a stale legacy companionSetId on every pairwise link/unlink denorm write", () => {
    const service = readService();
    const linkPayloadMatch = service.match(/function linkDenormPayload[\s\S]*?\n}\n/);
    const unlinkPayloadMatch = service.match(/function unlinkDenormPayload[\s\S]*?\n}\n/);

    assert.ok(linkPayloadMatch, "Expected to find linkDenormPayload in the source.");
    assert.ok(unlinkPayloadMatch, "Expected to find unlinkDenormPayload in the source.");
    assert.match(linkPayloadMatch[0], /companionSetId:\s*deleteField\(\)/);
    assert.match(unlinkPayloadMatch[0], /companionSetId:\s*deleteField\(\)/);
  });

  it("rejects markNeedsCompanion / clearNeedsCompanionUnlinked once a design has any companion neighbor", () => {
    const service = readService();

    assert.match(service, /MARK_NEEDS_COMPANION_LINKED_ERROR_MESSAGE/);
    assert.match(service, /CLEAR_NEEDS_COMPANION_LINKED_ERROR_MESSAGE/);

    const markFnMatch = service.match(/async function markNeedsCompanionInTransaction[\s\S]*?\n}\n/);
    const clearFnMatch = service.match(/async function clearNeedsCompanionUnlinkedInTransaction[\s\S]*?\n}\n/);

    assert.ok(markFnMatch, "Expected to find markNeedsCompanionInTransaction in the source.");
    assert.ok(clearFnMatch, "Expected to find clearNeedsCompanionUnlinkedInTransaction in the source.");
    assert.match(markFnMatch[0], /companionDesignIds\.length > 0/);
    assert.match(clearFnMatch[0], /companionDesignIds\.length > 0/);
  });

  it("never auto-raises Needs Companion on unlink", () => {
    const service = readService();
    const unlinkFnMatch = service.match(/async function unlinkPairInTransaction[\s\S]*?\n}\n/);

    assert.ok(unlinkFnMatch, "Expected to find unlinkPairInTransaction in the source.");
    assert.equal(unlinkFnMatch[0].includes("companionSetIncomplete"), false);
  });

  it("guards every mutation with the design-edit permission check", () => {
    const service = readService();

    assert.match(service, /function assertCanManageCompanionLinks/);
    assert.match(service, /permissionService\.canEditDesigns/);
  });
});
