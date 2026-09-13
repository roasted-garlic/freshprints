import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildIdentitySnapshotFieldUpdates } from "./propagateCustomerIdentitySnapshots";

describe("buildIdentitySnapshotFieldUpdates", () => {
  it("populates at-creation snapshots from previous current snapshots on first change", () => {
    const updates = buildIdentitySnapshotFieldUpdates(
      {
        customerUsernameSnapshot: "old1",
        customerDisplayNameSnapshot: "Old Name",
        name: "old1-CR0001",
      },
      { username: "new1", displayName: "New Name" },
    );

    assert.deepEqual(updates, {
      customerUsernameAtCreationSnapshot: "old1",
      customerDisplayNameAtCreationSnapshot: "Old Name",
      customerUsernameSnapshot: "new1",
      customerDisplayNameSnapshot: "New Name",
    });
  });

  it("preserves at-creation snapshots on later changes (old1 -> new1 -> new2)", () => {
    const afterFirst = buildIdentitySnapshotFieldUpdates(
      {
        customerUsernameSnapshot: "old1",
        customerDisplayNameSnapshot: "Old Name",
      },
      { username: "new1", displayName: "New One" },
    );

    assert.equal(afterFirst?.customerUsernameAtCreationSnapshot, "old1");

    const afterSecond = buildIdentitySnapshotFieldUpdates(
      {
        customerUsernameSnapshot: "new1",
        customerDisplayNameSnapshot: "New One",
        customerUsernameAtCreationSnapshot: "old1",
        customerDisplayNameAtCreationSnapshot: "Old Name",
        name: "old1-CR0001",
      },
      { username: "new2", displayName: "New Two" },
    );

    assert.deepEqual(afterSecond, {
      customerUsernameSnapshot: "new2",
      customerDisplayNameSnapshot: "New Two",
    });
    assert.equal(afterSecond?.customerUsernameAtCreationSnapshot, undefined);
    assert.equal(afterSecond?.name, undefined);
  });

  it("never mutates print request name", () => {
    const updates = buildIdentitySnapshotFieldUpdates(
      {
        customerUsernameSnapshot: "old1",
        name: "old1-CR0001",
      },
      { username: "new1", displayName: "Name" },
    );

    assert.equal("name" in (updates ?? {}), false);
  });

  it("returns null when snapshots already match target", () => {
    const updates = buildIdentitySnapshotFieldUpdates(
      {
        customerUsernameSnapshot: "same",
        customerDisplayNameSnapshot: "Same",
        customerUsernameAtCreationSnapshot: "same",
        customerDisplayNameAtCreationSnapshot: "Same",
      },
      { username: "same", displayName: "Same" },
    );

    assert.equal(updates, null);
  });
});
