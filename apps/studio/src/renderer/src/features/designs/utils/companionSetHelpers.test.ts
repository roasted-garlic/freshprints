import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addCompanionNeighbor,
  buildCompanionLinkId,
  compareDesignsForCompanionLinkPicker,
  filterEligibleCompanionLinkTargets,
  removeCompanionNeighbor,
  resolveCompanionSetStatusLabel,
  sortedCompanionPair,
} from "./companionSetHelpers";

describe("sortedCompanionPair", () => {
  it("sorts ascending regardless of call order", () => {
    assert.deepEqual(sortedCompanionPair("b", "a"), ["a", "b"]);
    assert.deepEqual(sortedCompanionPair("a", "b"), ["a", "b"]);
  });
});

describe("buildCompanionLinkId", () => {
  it("is deterministic and order-independent", () => {
    assert.equal(buildCompanionLinkId("design-b", "design-a"), "design-a_design-b");
    assert.equal(buildCompanionLinkId("design-a", "design-b"), "design-a_design-b");
  });

  it("never produces the same ID for two different pairs sharing one ID", () => {
    assert.notEqual(buildCompanionLinkId("design-a", "design-b"), buildCompanionLinkId("design-a", "design-c"));
  });
});

describe("addCompanionNeighbor", () => {
  it("adds a new neighbor and is idempotent when already present", () => {
    const withNeighbor = addCompanionNeighbor(["a"], "b");
    assert.deepEqual(withNeighbor, ["a", "b"]);

    const unchanged = addCompanionNeighbor(withNeighbor, "b");
    assert.deepEqual(unchanged, ["a", "b"]);
  });
});

describe("removeCompanionNeighbor", () => {
  it("removes a neighbor and is a no-op when already absent", () => {
    const withoutNeighbor = removeCompanionNeighbor(["a", "b"], "b");
    assert.deepEqual(withoutNeighbor, ["a"]);

    const unchanged = removeCompanionNeighbor(withoutNeighbor, "b");
    assert.deepEqual(unchanged, ["a"]);
  });

  it("removing the last neighbor yields an empty list", () => {
    assert.deepEqual(removeCompanionNeighbor(["only"], "only"), []);
  });
});

describe("resolveCompanionSetStatusLabel", () => {
  it("labels a design with no neighbors and no queue flag as Not linked", () => {
    assert.equal(resolveCompanionSetStatusLabel({}), "Not linked");
    assert.equal(resolveCompanionSetStatusLabel({ companionDesignIds: [] }), "Not linked");
  });

  it("labels an unlinked waiting design (queue flag true, no neighbors) as Needs Companion", () => {
    assert.equal(resolveCompanionSetStatusLabel({ companionSetIncomplete: true }), "Needs Companion");
    assert.equal(
      resolveCompanionSetStatusLabel({ companionDesignIds: [], companionSetIncomplete: true }),
      "Needs Companion",
    );
  });

  it("labels any design with at least one neighbor as Linked", () => {
    assert.equal(resolveCompanionSetStatusLabel({ companionDesignIds: ["peer-1"] }), "Linked");
    assert.equal(
      resolveCompanionSetStatusLabel({ companionDesignIds: ["peer-1", "peer-2"] }),
      "Linked",
    );
  });

  it("Needs Companion is unlinked-only — neighbors always win, even with a stale incomplete flag", () => {
    assert.equal(
      resolveCompanionSetStatusLabel({ companionDesignIds: ["peer-1"], companionSetIncomplete: true }),
      "Linked",
    );
  });
});

describe("filterEligibleCompanionLinkTargets", () => {
  const designs = [
    { id: "current", title: "Current" },
    { id: "existing-neighbor", title: "Existing neighbor" },
    { id: "other", title: "Other" },
    { id: "waiting", title: "Waiting", companionSetIncomplete: true },
    { id: "linked-elsewhere", title: "Linked elsewhere", companionDesignIds: ["some-other-design"] },
  ];

  it("excludes the current design and designs already a direct neighbor of it", () => {
    const eligible = filterEligibleCompanionLinkTargets(designs, {
      currentDesignId: "current",
      currentCompanionDesignIds: ["existing-neighbor"],
    });

    assert.deepEqual(
      eligible.map((design) => design.id),
      ["other", "waiting", "linked-elsewhere"],
    );
  });

  it("does not exclude a candidate already linked elsewhere — companions are many-to-many", () => {
    const eligible = filterEligibleCompanionLinkTargets(designs, { currentDesignId: "current" });

    assert.ok(eligible.some((design) => design.id === "linked-elsewhere"));
  });

  it("excludes only the current design when it has no neighbors yet", () => {
    const eligible = filterEligibleCompanionLinkTargets(designs, { currentDesignId: "current" });

    assert.deepEqual(
      eligible.map((design) => design.id),
      ["existing-neighbor", "other", "waiting", "linked-elsewhere"],
    );
  });
});

describe("compareDesignsForCompanionLinkPicker", () => {
  it("sorts Needs Companion designs first, then alphabetically by title", () => {
    const designs = [
      { title: "Zebra", companionSetIncomplete: false },
      { title: "Apple", companionSetIncomplete: true },
      { title: "Mango", companionSetIncomplete: false },
      { title: "Banana", companionSetIncomplete: true },
    ];

    const sorted = [...designs].sort(compareDesignsForCompanionLinkPicker);

    assert.deepEqual(sorted.map((design) => design.title), ["Apple", "Banana", "Mango", "Zebra"]);
  });
});
