import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import {
  buildShowQueuePrintRequestOptions,
  loadMoreShowQueuePrintRequestSources,
  mergeShowQueuePrintRequestSources,
  resolveShowQueuePrintRequestLinkTab,
  type ShowQueuePrintRequestSource,
} from "./showQueuePrintRequestSources";

function request(id: string, queueTab: PrintRequest["queueTab"], status: PrintRequest["status"] = "active"): PrintRequest {
  return {
    id,
    name: id,
    isInternal: true,
    status,
    itemCount: 1,
    queueTab,
    createdBy: "owner",
    updatedBy: "owner",
    createdAt: Timestamp.fromMillis(1),
    updatedAt: Timestamp.fromMillis(1),
  };
}

function source(
  tab: PrintRequestListTab,
  requests: PrintRequest[],
  options: Partial<
    Pick<ShowQueuePrintRequestSource, "hasMore" | "loadMore" | "summariesByRequestId">
  > = {},
): ShowQueuePrintRequestSource {
  return {
    tab,
    requests,
    summariesByRequestId:
      options.summariesByRequestId ??
      Object.fromEntries(requests.map((entry) => [entry.id, { totalQuantity: 1, uniqueDesignCount: 1 }])),
    hasMore: options.hasMore ?? false,
    isLoadingMore: false,
    loadMore: options.loadMore ?? (async () => undefined),
  };
}

describe("Show Queue print-request sources", () => {
  it("merges Working, Queued, and Printing pages plus exact off-page attachments without duplicates", () => {
    const working = request("working", "working");
    const queued = request("queued", "queued");
    const printing = request("printing", "printing");
    // Force-loaded via ensureRequestsLoaded into the "queued" source (e.g. attached to this show
    // but outside that tab's own loaded page) — still admitted because its own queueTab agrees
    // with the source it landed in.
    const attachedQueued = request("attached-queued", "queued");

    const merged = mergeShowQueuePrintRequestSources([
      source("working", [working]),
      source("queued", [queued, attachedQueued]),
      source("printing", [printing]),
    ]);

    assert.deepEqual(
      merged.requests.map((entry) => entry.id),
      ["working", "queued", "attached-queued", "printing"],
    );
    assert.deepEqual(Object.keys(merged.summariesByRequestId).sort(), [
      "attached-queued",
      "printing",
      "queued",
      "working",
    ]);
  });

  it("does not admit a request into a source whose tab disagrees with the request's own queueTab", () => {
    // Regression for the wrong-tab list-contamination defect: an attached request whose real
    // queueTab is "queued" was force-loaded (by ID) into the "working" source, which — before this
    // fix — merged it in unconditionally, making a Queued request appear as Working-tab data.
    const queuedRequest = request("queued-request", "queued");

    const merged = mergeShowQueuePrintRequestSources([
      source("working", [queuedRequest]),
      source("queued", []),
      source("printing", []),
    ]);

    assert.deepEqual(merged.requests, []);
  });

  it("admits a request into whichever source's tab actually matches its queueTab, even when also present elsewhere", () => {
    const queuedRequest = request("queued-request", "queued");

    const merged = mergeShowQueuePrintRequestSources([
      source("working", [queuedRequest]),
      source("queued", [queuedRequest]),
      source("printing", []),
    ]);

    assert.deepEqual(merged.requests.map((entry) => entry.id), ["queued-request"]);
    assert.deepEqual(Object.keys(merged.summariesByRequestId), ["queued-request"]);
  });

  it("never lets a source that did not admit a request overwrite that request's summary from a source that did (Implementation Review finding, 2026-08-03)", () => {
    // A request attached to a show is force-loaded (via ensureRequestsLoaded) into ALL THREE
    // sources, each of which independently fetches its own summary for the same ID. Only the
    // "queued" source's copy of this request is actually admitted (its queueTab is "queued"), but
    // before this fix, `mergeShowQueuePrintRequestSources` processed sources in a fixed order and
    // let whichever source was processed LAST silently overwrite the correct summary via
    // `Object.assign`, even though that later source never admitted the request at all.
    const queuedRequest = request("queued-request", "queued");

    const merged = mergeShowQueuePrintRequestSources([
      source("working", [queuedRequest], {
        summariesByRequestId: { "queued-request": { totalQuantity: 1, uniqueDesignCount: 1 } },
      }),
      source("queued", [queuedRequest], {
        summariesByRequestId: { "queued-request": { totalQuantity: 5, uniqueDesignCount: 2 } },
      }),
      source("printing", [queuedRequest], {
        // Processed last; must not win, since this source never admits this request (its
        // queueTab "queued" disagrees with this source's tab "printing").
        summariesByRequestId: { "queued-request": { totalQuantity: 999, uniqueDesignCount: 999 } },
      }),
    ]);

    assert.deepEqual(merged.requests.map((entry) => entry.id), ["queued-request"]);
    assert.deepEqual(merged.summariesByRequestId["queued-request"], {
      totalQuantity: 5,
      uniqueDesignCount: 2,
    });
  });

  it("admits a request with no queueTab (pre-backfill legacy document) regardless of source tab", () => {
    const legacyRequest = request("legacy", undefined);

    const merged = mergeShowQueuePrintRequestSources([
      source("working", [legacyRequest]),
      source("queued", []),
      source("printing", []),
    ]);

    assert.deepEqual(merged.requests.map((entry) => entry.id), ["legacy"]);
  });

  describe("resolveShowQueuePrintRequestLinkTab", () => {
    it("prefers the matched request's own queueTab over recomputing from local totals", () => {
      const tab = resolveShowQueuePrintRequestLinkTab({
        matchedRequest: { queueTab: "queued", status: "active" },
        // Deliberately zero/stale totals — mirrors a page session where
        // usePrintRequestAllocationTotals's once-per-mount snapshot has not been refreshed since
        // this request was added to a show.
        totalRequestedQuantity: 5,
        totalAllocatedQuantity: 0,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 0,
      });

      assert.equal(tab, "queued");
    });

    it("falls back to live derivation when queueTab is absent", () => {
      const tab = resolveShowQueuePrintRequestLinkTab({
        matchedRequest: { queueTab: undefined, status: "active" },
        totalRequestedQuantity: 5,
        totalAllocatedQuantity: 5,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 0,
      });

      assert.equal(tab, "queued");
    });

    it("falls back to live derivation when no request has been matched yet", () => {
      const tab = resolveShowQueuePrintRequestLinkTab({
        matchedRequest: undefined,
        totalRequestedQuantity: 0,
        totalAllocatedQuantity: 0,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 0,
      });

      assert.equal(tab, "working");
    });
  });

  it("keeps incomplete cross-classification candidates and excludes printed or attached requests", () => {
    const requests = [
      request("working", "working"),
      request("queued", "queued"),
      request("printing", "printing"),
      request("printed", "printed", "completed"),
      request("attached", "working"),
    ];
    const summariesByRequestId = Object.fromEntries(
      requests.map((entry) => [entry.id, { totalQuantity: 1, uniqueDesignCount: 1 }]),
    );
    const allocationTotalsByRequestId = {
      printed: {
        totalAllocatedQuantity: 1,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 1,
      },
    };

    assert.deepEqual(
      buildShowQueuePrintRequestOptions({
        requests,
        summariesByRequestId,
        allocationTotalsByRequestId,
        requestIdsAlreadyOnShow: new Set(["attached"]),
      }).map((option) => option.value),
      ["", "working", "queued", "printing"],
    );
  });

  it("advances only sources with a cursor-backed next page", async () => {
    const loaded: string[] = [];
    await loadMoreShowQueuePrintRequestSources([
      source("working", [], { hasMore: true, loadMore: async () => { loaded.push("working"); } }),
      source("queued", [], { hasMore: false, loadMore: async () => { loaded.push("queued"); } }),
      source("printing", [], { hasMore: true, loadMore: async () => { loaded.push("printing"); } }),
    ]);
    assert.deepEqual(loaded.sort(), ["printing", "working"]);
  });
});
