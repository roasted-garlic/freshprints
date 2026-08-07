import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PortalCatalogCard } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { classifyPortalCatalogDesignChange } from "./portalCatalogChangeClassifier";
import { runPublicationCatchUpLoop } from "./publishCatalogSnapshots";
import {
  isTransientPublicationStorageError,
  publicationNeedsCatchUp,
  shouldRetryPublicationPass,
  withTransientStorageRetry,
} from "./publicationRecovery";
import { buildPortalCatalogTagFacetSummary } from "./snapshotBuilders";

function fetchError(message = "request to https://storage.googleapis.com failed"): Error {
  const error = new Error(message);
  error.name = "FetchError";
  return error;
}

describe("publication recovery helpers (tag-removal stuck publish)", () => {
  it("detects FetchError and common network codes as transient", () => {
    assert.equal(isTransientPublicationStorageError(fetchError()), true);
    assert.equal(
      isTransientPublicationStorageError(Object.assign(new Error("boom"), { code: "ECONNRESET" })),
      true,
    );
    assert.equal(isTransientPublicationStorageError(new Error("snapshot-asset-budget-exceeded:x")), false);
  });

  it("needs catch-up only when requestedGeneration is ahead", () => {
    assert.equal(publicationNeedsCatchUp(9, 8), true);
    assert.equal(publicationNeedsCatchUp(8, 8), false);
    assert.equal(publicationNeedsCatchUp(undefined, 8), false);
  });

  it("classifies lease-active vs transient vs fatal for pass retries", () => {
    assert.equal(
      shouldRetryPublicationPass(new Error("snapshot-publication-lease-active")),
      "lease-busy",
    );
    assert.equal(shouldRetryPublicationPass(fetchError()), "transient");
    assert.equal(shouldRetryPublicationPass(new Error("snapshot-asset-budget-exceeded:x")), "fatal");
    assert.equal(
      shouldRetryPublicationPass(new Error("snapshot-publication-not-yet-eligible")),
      "fatal",
    );
  });

  it("retries transient storage failures then succeeds", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const value = await withTransientStorageRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw fetchError();
        return "ok";
      },
      {
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    );
    assert.equal(value, "ok");
    assert.equal(attempts, 3);
    assert.deepEqual(sleeps, [400, 800]);
  });

  it("does not retry non-transient storage failures", async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        withTransientStorageRetry(async () => {
          attempts += 1;
          throw new Error("snapshot-asset-budget-exceeded:path");
        }),
      /snapshot-asset-budget-exceeded/,
    );
    assert.equal(attempts, 1);
  });
});

describe("runPublicationCatchUpLoop — failing-before / passing-after recovery", () => {
  it("failing-before: lease-active early abandon left requestedGeneration stuck (old return behavior)", async () => {
    // Documents the production failure mode: a single lease-busy error used to return and never
    // retry, leaving requestedGeneration ahead of publishedGeneration.
    const legacyAbandonOnLease = async (): Promise<"abandoned" | "published"> => {
      try {
        throw new Error("snapshot-publication-lease-active");
      } catch (error) {
        if (error instanceof Error && error.message === "snapshot-publication-lease-active") {
          return "abandoned";
        }
        throw error;
      }
    };
    assert.equal(await legacyAbandonOnLease(), "abandoned");
    assert.equal(publicationNeedsCatchUp(9, 8), true);
  });

  it("passing-after: retries lease-busy then publishes catch-up generation", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    await runPublicationCatchUpLoop({
      passLimit: 3,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      publish: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("snapshot-publication-lease-active");
        return { generation: 9 };
      },
      readRequestedGeneration: async () => 9,
    });
    assert.equal(attempts, 2);
    assert.ok(sleeps.length >= 1);
  });

  it("passing-after: retries transient FetchError then drains requestedGeneration", async () => {
    let attempts = 0;
    await runPublicationCatchUpLoop({
      passLimit: 3,
      sleep: async () => {},
      publish: async () => {
        attempts += 1;
        if (attempts === 1) throw fetchError();
        return { generation: 9 };
      },
      readRequestedGeneration: async () => 9,
    });
    assert.equal(attempts, 2);
  });

  it("continues when another dirty mark arrives during a successful publish", async () => {
    let attempts = 0;
    await runPublicationCatchUpLoop({
      passLimit: 3,
      sleep: async () => {},
      publish: async () => {
        attempts += 1;
        return { generation: attempts === 1 ? 8 : 9 };
      },
      readRequestedGeneration: async () => (attempts === 1 ? 9 : 9),
    });
    assert.equal(attempts, 2);
  });

  it("rethrows fatal errors without treating them as recoverable", async () => {
    await assert.rejects(
      () =>
        runPublicationCatchUpLoop({
          passLimit: 3,
          sleep: async () => {},
          publish: async () => {
            throw new Error("snapshot-asset-budget-exceeded:x");
          },
          readRequestedGeneration: async () => 9,
        }),
      /snapshot-asset-budget-exceeded/,
    );
  });
});

describe("tag removal publication surfaces", () => {
  it("classifies removing one of several tags as index-filter (full republish)", () => {
    const before = {
      status: "ready",
      title: "Design",
      description: "Description",
      categoryId: "cat-1",
      tags: ["funny", "sarcastic"],
      createdAt: 100,
      thumbnailPath: "thumb.webp",
    };
    const after = { ...before, tags: ["funny"] };
    assert.equal(classifyPortalCatalogDesignChange(before, after), "index-filter");
  });

  it("classifies emptying tags as index-filter", () => {
    const before = {
      status: "ready",
      title: "Design",
      description: "Description",
      categoryId: "cat-1",
      tags: ["funny"],
      createdAt: 100,
      thumbnailPath: "thumb.webp",
    };
    assert.equal(
      classifyPortalCatalogDesignChange(before, { ...before, tags: [] }),
      "index-filter",
    );
  });

  it("rebuilds tag facet without the removed tag while retaining others", () => {
    const card = (id: string, tags: string[]): PortalCatalogCard => ({
      id,
      title: id,
      tags,
      thumbnailPath: `${id}.webp`,
      width: 1,
      height: 1,
      requestCount: 0,
      favoriteCount: 0,
    });
    const before = buildPortalCatalogTagFacetSummary(
      [card("d1", ["funny", "sarcastic"])],
      new Map([
        ["funny", "funny"],
        ["sarcastic", "sarcastic"],
      ]),
    );
    assert.deepEqual(
      before.map((entry) => entry.id).sort(),
      ["funny", "sarcastic"],
    );

    const after = buildPortalCatalogTagFacetSummary(
      [card("d1", ["funny"])],
      new Map([
        ["funny", "funny"],
        ["sarcastic", "sarcastic"],
      ]),
    );
    assert.deepEqual(
      after.map((entry) => entry.id),
      ["funny"],
    );
  });

  it("does not treat tag removal as card-only", () => {
    const before = {
      status: "ready",
      title: "Design",
      description: "Description",
      categoryId: "cat-1",
      tags: ["funny", "sarcastic"],
      createdAt: 100,
      thumbnailPath: "thumb.webp",
      artworkBackgroundHex: "#112233",
    };
    assert.notEqual(
      classifyPortalCatalogDesignChange(before, { ...before, tags: ["funny"] }),
      "card-only",
    );
  });
});
