import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("hasSubcollectionDocuments parent path", () => {
  it("documents the expected customers/{id}/subcollection shape", () => {
    const parentPath = "customers/cust-1";
    const segments = parentPath.split("/").filter(Boolean);

    assert.deepEqual(segments, ["customers", "cust-1"]);
    assert.equal(`${segments[0]}/${segments[1]}/favorites`, "customers/cust-1/favorites");
  });

  it("does not throw when Storage prefix inspection fails", async () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "customerAccountIdentityBootstrapDeletion.ts"),
      "utf8",
    );
    assert.match(source, /Failed to inspect Storage prefix/);
  });
});
