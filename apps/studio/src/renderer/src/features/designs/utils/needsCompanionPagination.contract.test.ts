import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDesignListPageHasMore } from "./designListPageHasMore";
import {
  getDesignListQueryCacheKey,
  serializeDesignListQueryKey,
} from "./designListQueryIdentity";
import type { DesignListQuery } from "../types/designQuery.types";

const readyBrowse: DesignListQuery = {
  sortDirection: "desc",
  sortField: "readyAt",
  statusIn: ["ready"],
};

const needsCompanionBrowse: DesignListQuery = {
  ...readyBrowse,
  companionSetIncomplete: true,
};

describe("Needs Companion query identity (D1/D2)", () => {
  it("hook query key changes when companionSetIncomplete toggles ON/OFF", () => {
    const offKey = serializeDesignListQueryKey(readyBrowse);
    const onKey = serializeDesignListQueryKey(needsCompanionBrowse);
    const offAgainKey = serializeDesignListQueryKey({
      ...readyBrowse,
      companionSetIncomplete: undefined,
    });

    assert.notEqual(offKey, onKey);
    assert.equal(offKey, offAgainKey);
  });

  it("page/count cache key changes when companionSetIncomplete toggles ON/OFF", () => {
    const offKey = getDesignListQueryCacheKey(readyBrowse);
    const onKey = getDesignListQueryCacheKey(needsCompanionBrowse);

    assert.notEqual(offKey, onKey);
    assert.match(onKey, /"companionSetIncomplete":true/);
    assert.doesNotMatch(offKey, /companionSetIncomplete/);
  });

  it("repeated ON/OFF toggles keep distinct identities for ON and shared identity for OFF", () => {
    const keys = [
      serializeDesignListQueryKey(readyBrowse),
      serializeDesignListQueryKey(needsCompanionBrowse),
      serializeDesignListQueryKey(readyBrowse),
      serializeDesignListQueryKey(needsCompanionBrowse),
      serializeDesignListQueryKey(readyBrowse),
    ];

    assert.equal(keys[0], keys[2]);
    assert.equal(keys[0], keys[4]);
    assert.equal(keys[1], keys[3]);
    assert.notEqual(keys[0], keys[1]);
  });

  it("stale companion response cannot share cache with ordinary ready list", () => {
    const companionPage = getDesignListQueryCacheKey({
      ...needsCompanionBrowse,
      cursor: { designId: "d1", sortMillis: 1 },
    });
    const readyPage = getDesignListQueryCacheKey({
      ...readyBrowse,
      cursor: { designId: "d1", sortMillis: 1 },
    });

    assert.notEqual(companionPage, readyPage);
  });
});

describe("bounded pageSize+1 hasMore contract (D1)", () => {
  it("zero results => no Load More", () => {
    assert.equal(buildDesignListPageHasMore(0, 100), false);
  });

  it("fewer than page size => no Load More", () => {
    assert.equal(buildDesignListPageHasMore(3, 100), false);
    assert.equal(buildDesignListPageHasMore(99, 100), false);
  });

  it("exact page size without extra row => no Load More (final page)", () => {
    assert.equal(buildDesignListPageHasMore(100, 100), false);
  });

  it("pageSize + 1 returned => Load More visible (genuine next page)", () => {
    assert.equal(buildDesignListPageHasMore(101, 100), true);
  });
});
