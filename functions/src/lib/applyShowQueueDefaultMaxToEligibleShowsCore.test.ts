import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseApplyShowQueueDefaultMaxRequest,
  applyShowQueueDefaultMaxToEligibleShowsCore,
  APPLY_SHOW_QUEUE_DEFAULT_MAX_BATCH_SIZE,
} from "./applyShowQueueDefaultMaxToEligibleShowsCore";

describe("parseApplyShowQueueDefaultMaxRequest", () => {
  it("accepts null to clear", () => {
    assert.deepEqual(parseApplyShowQueueDefaultMaxRequest({ defaultMaxTotalQuantity: null }), {
      defaultMaxTotalQuantity: null,
    });
  });

  it("accepts non-negative integers", () => {
    assert.deepEqual(parseApplyShowQueueDefaultMaxRequest({ defaultMaxTotalQuantity: 0 }), {
      defaultMaxTotalQuantity: 0,
    });
    assert.deepEqual(parseApplyShowQueueDefaultMaxRequest({ defaultMaxTotalQuantity: 120 }), {
      defaultMaxTotalQuantity: 120,
    });
  });

  it("rejects malformed values", () => {
    assert.throws(() => parseApplyShowQueueDefaultMaxRequest({}), /required/i);
    assert.throws(
      () => parseApplyShowQueueDefaultMaxRequest({ defaultMaxTotalQuantity: -1 }),
      /non-negative/i,
    );
    assert.throws(
      () => parseApplyShowQueueDefaultMaxRequest({ defaultMaxTotalQuantity: 1.5 }),
      /integer/i,
    );
    assert.throws(
      () => parseApplyShowQueueDefaultMaxRequest({ defaultMaxTotalQuantity: "80" }),
      /integer|non-negative/i,
    );
  });
});

type FakeDoc = {
  id: string;
  data: Record<string, unknown>;
};

function timestamp(iso: string) {
  const date = new Date(iso);
  return { toDate: () => date };
}

function createFakeDb(shows: FakeDoc[]) {
  const settingsWrites: Array<Record<string, unknown>> = [];
  const showUpdates: Array<{ id: string; payload: Record<string, unknown> }> = [];
  let failOnChunkIndex: number | null = null;
  let commitCount = 0;

  const db = {
    collection(name: string) {
      if (name === "settings") {
        return {
          doc() {
            return {
              async set(payload: Record<string, unknown>) {
                settingsWrites.push(payload);
              },
            };
          },
        };
      }

      if (name === "upcomingShows") {
        return {
          where() {
            return {
              async get() {
                return {
                  docs: shows.map((show) => ({
                    id: show.id,
                    data: () => show.data,
                  })),
                };
              },
            };
          },
          doc(id: string) {
            return { id, __path: `upcomingShows/${id}` };
          },
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    },
    batch() {
      const ops: Array<{ id: string; payload: Record<string, unknown> }> = [];
      return {
        update(ref: { id: string }, payload: Record<string, unknown>) {
          ops.push({ id: ref.id, payload });
        },
        async commit() {
          const chunkIndex = commitCount;
          commitCount += 1;
          if (failOnChunkIndex !== null && chunkIndex === failOnChunkIndex) {
            throw new Error("simulated batch failure");
          }
          for (const op of ops) {
            showUpdates.push(op);
          }
        },
      };
    },
    __settingsWrites: settingsWrites,
    __showUpdates: showUpdates,
    __setFailOnChunkIndex(index: number | null) {
      failOnChunkIndex = index;
    },
  };

  return db;
}

describe("applyShowQueueDefaultMaxToEligibleShowsCore", () => {
  const now = new Date("2026-09-15T12:00:00Z");

  it("updates global default and eligible shows; skips below-allocated and exclusions", async () => {
    const db = createFakeDb([
      {
        id: "eligible-open",
        data: {
          source: "whatnot",
          productionStatus: "open",
          scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
          allocatedQuantity: 10,
          maxTotalQuantity: 50,
          maxQuantityOverridden: true,
        },
      },
      {
        id: "eligible-full",
        data: {
          source: "dev_fixture",
          productionStatus: "full",
          scheduledStartAt: timestamp("2026-10-02T00:00:00Z"),
          allocatedQuantity: 70,
          maxTotalQuantity: 80,
        },
      },
      {
        id: "skip-below-allocated",
        data: {
          source: "whatnot",
          productionStatus: "open",
          scheduledStartAt: timestamp("2026-10-03T00:00:00Z"),
          allocatedQuantity: 90,
          maxTotalQuantity: 100,
        },
      },
      {
        id: "past-excluded",
        data: {
          source: "whatnot",
          productionStatus: "printing",
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
          allocatedQuantity: 5,
          maxTotalQuantity: 40,
        },
      },
      {
        id: "internal-excluded",
        data: {
          source: "staff_gang_sheet",
          productionStatus: "open",
          scheduledStartAt: timestamp("2026-10-04T00:00:00Z"),
          allocatedQuantity: 0,
          maxTotalQuantity: 200,
        },
      },
    ]);

    const result = await applyShowQueueDefaultMaxToEligibleShowsCore({
      db: db as never,
      callerUid: "owner-1",
      defaultMaxTotalQuantity: 75,
      now,
    });

    assert.equal(result.updatedShowCount, 2);
    assert.equal(result.skippedBelowAllocatedCount, 1);
    assert.equal(result.defaultMaxTotalQuantity, 75);
    assert.equal(db.__settingsWrites.length, 1);
    assert.equal(db.__settingsWrites[0]?.defaultMaxTotalQuantity, 75);
    assert.equal(db.__showUpdates.length, 2);
    assert.deepEqual(
      db.__showUpdates.map((row) => row.id).sort(),
      ["eligible-full", "eligible-open"],
    );
    for (const update of db.__showUpdates) {
      assert.equal(update.payload.maxTotalQuantity, 75);
      assert.equal(update.payload.maxQuantityOverridden, false);
      assert.equal(update.payload.updatedBy, "owner-1");
    }
  });

  it("clears max on no-limit apply and reports zero when no eligible shows", async () => {
    const db = createFakeDb([
      {
        id: "completed",
        data: {
          source: "whatnot",
          productionStatus: "completed",
          scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
          allocatedQuantity: 10,
          maxTotalQuantity: 50,
        },
      },
    ]);

    const result = await applyShowQueueDefaultMaxToEligibleShowsCore({
      db: db as never,
      callerUid: "admin-1",
      defaultMaxTotalQuantity: null,
      now,
    });

    assert.equal(result.updatedShowCount, 0);
    assert.equal(result.skippedBelowAllocatedCount, 0);
    assert.equal(result.defaultMaxTotalQuantity, null);
    assert.equal(typeof db.__settingsWrites[0]?.defaultMaxTotalQuantity, "object");
  });

  it("throws a truthful partial-failure after some chunks succeed", async () => {
    const manyShows: FakeDoc[] = Array.from({ length: 3 }, (_, index) => ({
      id: `show-${index}`,
      data: {
        source: "whatnot",
        productionStatus: "open",
        scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
        allocatedQuantity: 0,
        maxTotalQuantity: 20,
      },
    }));
    const db = createFakeDb(manyShows);
    db.__setFailOnChunkIndex(1);

    await assert.rejects(
      () =>
        applyShowQueueDefaultMaxToEligibleShowsCore({
          db: db as never,
          callerUid: "owner-1",
          defaultMaxTotalQuantity: 40,
          now,
          batchSize: 2,
        }),
      (error: unknown) => {
        assert.ok(error && typeof error === "object");
        const httpsLike = error as { message?: string; details?: { updatedShowCount?: number } };
        assert.match(String(httpsLike.message), /only 2 of 3/i);
        assert.equal(httpsLike.details?.updatedShowCount, 2);
        return true;
      },
    );
  });

  it("documents the default batch size under Firestore limits", () => {
    assert.ok(APPLY_SHOW_QUEUE_DEFAULT_MAX_BATCH_SIZE <= 500);
    assert.ok(APPLY_SHOW_QUEUE_DEFAULT_MAX_BATCH_SIZE > 0);
  });
});
