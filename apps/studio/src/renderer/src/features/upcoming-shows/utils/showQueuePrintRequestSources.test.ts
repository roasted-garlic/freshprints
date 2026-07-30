import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import {
  buildShowQueuePrintRequestOptions,
  loadMoreShowQueuePrintRequestSources,
  mergeShowQueuePrintRequestSources,
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
  requests: PrintRequest[],
  options: Partial<Pick<ShowQueuePrintRequestSource, "hasMore" | "loadMore">> = {},
): ShowQueuePrintRequestSource {
  return {
    requests,
    summariesByRequestId: Object.fromEntries(
      requests.map((entry) => [entry.id, { totalQuantity: 1, uniqueDesignCount: 1 }]),
    ),
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
    const attachedPrinted = request("attached-printed", "printed", "completed");

    const merged = mergeShowQueuePrintRequestSources([
      source([working]),
      source([queued, working]),
      source([printing, attachedPrinted]),
    ]);

    assert.deepEqual(
      merged.requests.map((entry) => entry.id),
      ["working", "queued", "printing", "attached-printed"],
    );
    assert.deepEqual(Object.keys(merged.summariesByRequestId).sort(), [
      "attached-printed",
      "printing",
      "queued",
      "working",
    ]);
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
      source([], { hasMore: true, loadMore: async () => { loaded.push("working"); } }),
      source([], { hasMore: false, loadMore: async () => { loaded.push("queued"); } }),
      source([], { hasMore: true, loadMore: async () => { loaded.push("printing"); } }),
    ]);
    assert.deepEqual(loaded.sort(), ["printing", "working"]);
  });
});
