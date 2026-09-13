import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("updateUpcomingShowMetadata contract", () => {
  const serviceSource = readFileSync(path.join(here, "upcomingShowService.ts"), "utf8");
  const permissionSource = readFileSync(
    path.join(here, "..", "..", "permissions", "services", "permissionService.ts"),
    "utf8",
  );

  it("requires owner permission before metadata writes", () => {
    assert.match(serviceSource, /async updateUpcomingShowMetadata\(/);
    assert.match(serviceSource, /canEditUpcomingShowMetadata\(caller\)/);
    assert.match(serviceSource, /Only owners can edit show details\./);
    assert.match(permissionSource, /canEditUpcomingShowMetadata\(user: UserLike\)/);
  });

  it("rejects Internal Gang Sheets and preserves Whatnot show ID", () => {
    assert.match(serviceSource, /Internal Gang Sheets cannot be edited here\./);
    assert.match(serviceSource, /parsed\.whatnotShowId !== show\.whatnotShowId/);
    assert.match(serviceSource, /Whatnot URL must refer to the same show ID/);
  });

  it("updates only metadata fields through updateUpcomingShow", () => {
    const metadataBlock = serviceSource.slice(
      serviceSource.indexOf("async updateUpcomingShowMetadata"),
      serviceSource.indexOf("async updateUpcomingShow", serviceSource.indexOf("async updateUpcomingShowMetadata") + 1),
    );
    assert.match(metadataBlock, /title:/);
    assert.match(metadataBlock, /scheduledStartAt:/);
    assert.match(metadataBlock, /notes:/);
    assert.match(metadataBlock, /whatnotUrl:/);
    assert.doesNotMatch(metadataBlock, /productionStatus:/);
    assert.doesNotMatch(metadataBlock, /productionResolutionKind:/);
    assert.doesNotMatch(metadataBlock, /allocatedQuantity:/);
  });
});
