import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveDuplicateInsertAfterSortOrder,
  resolveDuplicateInsertBeforeSortOrder,
  sortPrintRequestItemsForDisplay,
  sortPrintRequestItemsNewestFirst,
} from "./printRequestItemDisplayOrder";

describe("resolveDuplicateInsertAfterSortOrder", () => {
  it("places the duplicate between the source and the next sibling", () => {
    const result = resolveDuplicateInsertAfterSortOrder({
      sourceItemId: "b",
      items: [
        { id: "a", sortOrder: 1 },
        { id: "b", sortOrder: 3 },
        { id: "c", sortOrder: 5 },
      ],
    });

    assert.equal(result.duplicateSortOrder, 4);
    assert.equal(result.sourceSortOrderUpdate, undefined);
  });

  it("places the duplicate just after the last item when there is no next sibling", () => {
    const result = resolveDuplicateInsertAfterSortOrder({
      sourceItemId: "b",
      items: [
        { id: "a", sortOrder: 2 },
        { id: "b", sortOrder: 4 },
      ],
    });

    assert.equal(result.duplicateSortOrder, 4.5);
    assert.equal(result.sourceSortOrderUpdate, undefined);
  });

  it("anchors a source without sortOrder and inserts after it", () => {
    const result = resolveDuplicateInsertAfterSortOrder({
      sourceItemId: "b",
      items: [
        { id: "a", createdAtMillis: 1 },
        { id: "b", createdAtMillis: 2 },
        { id: "c", createdAtMillis: 3 },
      ],
    });

    assert.equal(result.sourceSortOrderUpdate, 200);
    assert.equal(result.duplicateSortOrder, 250);
  });
});

describe("resolveDuplicateInsertBeforeSortOrder", () => {
  it("places the duplicate between the previous sibling and the source", () => {
    const result = resolveDuplicateInsertBeforeSortOrder({
      sourceItemId: "b",
      items: [
        { id: "a", sortOrder: 1 },
        { id: "b", sortOrder: 3 },
        { id: "c", sortOrder: 5 },
      ],
    });

    assert.equal(result.duplicateSortOrder, 2);
    assert.equal(result.sourceSortOrderUpdate, undefined);
  });

  it("places the duplicate just before the source when there is no previous sibling", () => {
    const result = resolveDuplicateInsertBeforeSortOrder({
      sourceItemId: "a",
      items: [
        { id: "a", sortOrder: 2 },
        { id: "b", sortOrder: 4 },
      ],
    });

    assert.equal(result.duplicateSortOrder, 1.5);
    assert.equal(result.sourceSortOrderUpdate, undefined);
  });

  it("with newest-first display, insert-before lands visually to the right of source", () => {
    const items = [
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 3 },
      { id: "c", sortOrder: 5 },
    ];
    const result = resolveDuplicateInsertBeforeSortOrder({
      sourceItemId: "b",
      items,
    });
    const display = sortPrintRequestItemsNewestFirst([
      { id: "a", sortOrder: 1, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "b", sortOrder: 3, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "dup", sortOrder: result.duplicateSortOrder, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "c", sortOrder: 5, quantity: 1, printRequestId: "r", status: "pending" },
    ] as never);

    assert.deepEqual(
      display.map((item) => item.id),
      ["c", "b", "dup", "a"],
    );
  });
});

describe("sortPrintRequestItemsForDisplay", () => {
  it("orders by sortOrder ascending", () => {
    const sorted = sortPrintRequestItemsForDisplay([
      { id: "c", sortOrder: 5, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "a", sortOrder: 1, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "b", sortOrder: 3, quantity: 1, printRequestId: "r", status: "pending" },
    ] as never);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ["a", "b", "c"],
    );
  });
});

describe("sortPrintRequestItemsNewestFirst", () => {
  it("orders by sortOrder descending", () => {
    const sorted = sortPrintRequestItemsNewestFirst([
      { id: "c", sortOrder: 5, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "a", sortOrder: 1, quantity: 1, printRequestId: "r", status: "pending" },
      { id: "b", sortOrder: 3, quantity: 1, printRequestId: "r", status: "pending" },
    ] as never);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ["c", "b", "a"],
    );
  });
});
