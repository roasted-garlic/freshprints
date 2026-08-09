import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { User } from "../../users/types/user.types";
import type { Category } from "../types/category.types";
import { persistCategoryArchive } from "./persistCategoryArchive";

function baseCategory(overrides: Partial<Category> & Pick<Category, "id" | "isActive">): Category {
  return {
    name: "Occasions",
    sortOrder: 0,
    createdBy: "u1",
    updatedBy: "u1",
    createdAt: { seconds: 0, nanoseconds: 0 } as Category["createdAt"],
    updatedAt: { seconds: 0, nanoseconds: 0 } as Category["updatedAt"],
    ...overrides,
  };
}

const caller = { id: "owner-1", role: "owner", isActive: true } as User;

describe("Amendment 2 — persistCategoryArchive (Case A)", () => {
  it("falls back to client archive when guards callable returns success but doc stays active", async () => {
    let clientArchiveCalls = 0;
    const reads: Category[] = [
      baseCategory({ id: "cat-1", isActive: true }),
      baseCategory({ id: "cat-1", isActive: false }),
    ];

    const result = await persistCategoryArchive(caller, "cat-1", {
      archiveViaGuards: async () => ({
        outcome: "archive",
        message: "Category archived.",
        entityId: "cat-1",
        categoryId: "cat-1",
      }),
      archiveViaClient: async () => {
        clientArchiveCalls += 1;
        return baseCategory({ id: "cat-1", isActive: false });
      },
      getCategoryById: async () => {
        const next = reads.shift();
        assert.ok(next);
        return next;
      },
      clearCaches: () => undefined,
    });

    assert.equal(clientArchiveCalls, 1);
    assert.equal(result.isActive, false);
  });

  it("does not call client archive when guards callable already left the doc inactive", async () => {
    let clientArchiveCalls = 0;

    const result = await persistCategoryArchive(caller, "cat-1", {
      archiveViaGuards: async () => ({
        outcome: "archive",
        message: "Category archived.",
        entityId: "cat-1",
        categoryId: "cat-1",
      }),
      archiveViaClient: async () => {
        clientArchiveCalls += 1;
        return baseCategory({ id: "cat-1", isActive: false });
      },
      getCategoryById: async () => baseCategory({ id: "cat-1", isActive: false }),
      clearCaches: () => undefined,
    });

    assert.equal(clientArchiveCalls, 0);
    assert.equal(result.isActive, false);
  });

  it("falls back to client archive when guards callable rejects (e.g. admin / unreachable)", async () => {
    let clientArchiveCalls = 0;

    const result = await persistCategoryArchive(caller, "cat-1", {
      archiveViaGuards: async () => {
        throw new Error("Only owners can archive categories and tags.");
      },
      archiveViaClient: async () => {
        clientArchiveCalls += 1;
        return baseCategory({ id: "cat-1", isActive: false });
      },
      getCategoryById: async () => {
        if (clientArchiveCalls === 0) {
          return baseCategory({ id: "cat-1", isActive: true });
        }
        return baseCategory({ id: "cat-1", isActive: false });
      },
      clearCaches: () => undefined,
    });

    assert.equal(clientArchiveCalls, 1);
    assert.equal(result.isActive, false);
  });

  it("refuses success when the document remains active after client archive", async () => {
    await assert.rejects(
      () =>
        persistCategoryArchive(caller, "cat-1", {
          archiveViaGuards: async () => ({
            outcome: "archive",
            message: "Category archived.",
            entityId: "cat-1",
            categoryId: "cat-1",
          }),
          archiveViaClient: async () => baseCategory({ id: "cat-1", isActive: true }),
          getCategoryById: async () => baseCategory({ id: "cat-1", isActive: true }),
          clearCaches: () => undefined,
        }),
      /did not persist/i,
    );
  });

  it("does not bypass a guards blocked outcome with client archive", async () => {
    let clientArchiveCalls = 0;

    await assert.rejects(
      () =>
        persistCategoryArchive(caller, "cat-1", {
          archiveViaGuards: async () => ({
            outcome: "blocked",
            message: "This category cannot be archived while 3 design(s) still use it.",
            entityId: "cat-1",
            categoryId: "cat-1",
            blockers: [
              {
                code: "category_referenced_by_designs",
                message: "This category cannot be archived while 3 design(s) still use it.",
              },
            ],
          }),
          archiveViaClient: async () => {
            clientArchiveCalls += 1;
            return baseCategory({ id: "cat-1", isActive: false });
          },
          getCategoryById: async () => baseCategory({ id: "cat-1", isActive: true }),
          clearCaches: () => undefined,
        }),
      /still use it/i,
    );

    assert.equal(clientArchiveCalls, 0);
  });
});
