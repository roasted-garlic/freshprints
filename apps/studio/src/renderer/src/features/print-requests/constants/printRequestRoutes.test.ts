import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRINT_REQUEST_LIST_TABS,
  getPrintRequestsPath,
  resolveCanonicalPrintRequestsRoute,
  resolvePrintRequestListKind,
  resolveWorkingFilterClick,
  shouldReplacePrintRequestsPath,
  type PrintRequestRouteTab,
} from "./printRequestRoutes";
import {
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  resolvePrintRequestWorkingTriageBucket,
  type PrintRequestWorkingTriageFilter,
} from "@fresh-prints/shared/utils/printRequestWorkingTriage";

describe("Print Requests route normalization", () => {
  it("does not replace an already canonical populated or empty tab route", () => {
    for (const tab of PRINT_REQUEST_LIST_TABS) {
      assert.equal(
        shouldReplacePrintRequestsPath(
          {
            requestId: `${tab}-request`,
            kind: null,
            tab,
            workingFilter: tab === "working" ? "active" : null,
          },
          {
            requestId: `${tab}-request`,
            kind: "customer",
            tab,
            workingFilter: tab === "working" ? "active" : undefined,
          },
        ),
        false,
      );
      assert.equal(
        shouldReplacePrintRequestsPath(
          {
            requestId: null,
            kind: null,
            tab,
            workingFilter: tab === "working" ? "active" : null,
          },
          { kind: "customer", tab, workingFilter: tab === "working" ? "active" : undefined },
        ),
        false,
      );
    }
  });

  it("performs exactly one replacement for every real tab transition across five cycles", () => {
    let current: {
      requestId: string | null;
      kind: string | null;
      tab: PrintRequestRouteTab;
      workingFilter: string | null;
    } = {
      requestId: "working-request",
      kind: null,
      tab: "working",
      workingFilter: "active",
    };
    let replacements = 0;

    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const tab of ["queued", "printing", "printed", "working"] as const) {
        const next = {
          requestId: `${tab}-request`,
          kind: "customer" as const,
          tab,
          workingFilter: tab === "working" ? "active" as const : undefined,
        };
        if (shouldReplacePrintRequestsPath(current, next)) {
          replacements += 1;
          current = {
            requestId: next.requestId,
            kind: next.kind,
            tab: next.tab,
            workingFilter: next.workingFilter ?? null,
          };
        }
        assert.equal(
          shouldReplacePrintRequestsPath(current, next),
          false,
        );
      }
    }

    assert.equal(replacements, 20);
  });

  it("normalizes populated and empty browser back/forward destinations without loops", () => {
    const history = [
      { requestId: "working-request", tab: "working" as const },
      { requestId: null, tab: "queued" as const },
      { requestId: "printed-request", tab: "printed" as const },
    ];

    for (const destination of [...history, ...history.slice().reverse()]) {
      const path = getPrintRequestsPath({
        requestId: destination.requestId ?? undefined,
        tab: destination.tab,
      });
      const search = new URL(path, "http://local.test").searchParams;
      assert.equal(
        shouldReplacePrintRequestsPath(
          {
            requestId: search.get("requestId"),
            kind: search.get("kind"),
            tab: search.get("tab"),
            workingFilter: search.get("workingFilter"),
          },
          {
            requestId: destination.requestId ?? undefined,
            kind: "customer",
            tab: destination.tab,
          },
        ),
        false,
      );
    }
  });

  it("waits for async data, preserves valid deep links, and follows moved requests", () => {
    const empty = { working: [], queued: [], printing: [], printed: [] };
    assert.equal(
      resolveCanonicalPrintRequestsRoute({
        dataReady: false,
        eligibleRequestIds: [],
        requestedRequestId: "request-1",
        requestedKind: null,
        requestedTab: "working",
        requestedWorkingFilter: "active",
        requestsByTab: empty,
      }),
      null,
    );

    const loaded = {
      working: [{ id: "request-1" }],
      queued: [{ id: "request-2" }],
      printing: [],
      printed: [],
    };
    assert.deepEqual(
      resolveCanonicalPrintRequestsRoute({
        dataReady: true,
        eligibleRequestIds: ["request-1"],
        requestedRequestId: "request-1",
        requestedKind: null,
        requestedTab: "working",
        requestedWorkingFilter: "active",
        requestsByTab: loaded,
      }),
      { requestId: "request-1", kind: "customer", tab: "working", workingFilter: "active" },
    );

    loaded.working = [];
    loaded.queued = [{ id: "request-2" }, { id: "request-1" }];
    assert.deepEqual(
      resolveCanonicalPrintRequestsRoute({
        dataReady: true,
        eligibleRequestIds: [],
        requestedRequestId: "request-1",
        requestedKind: null,
        requestedTab: "working",
        requestedWorkingFilter: "active",
        requestsByTab: loaded,
      }),
      { kind: "customer", tab: "working", workingFilter: "active" },
    );
  });

  it("replaces a stale request once and settles on populated or empty tabs", () => {
    const requestsByTab = {
      working: [{ id: "working-1" }],
      queued: [],
      printing: [{ id: "printing-1" }],
      printed: [],
    };
    const populated = resolveCanonicalPrintRequestsRoute({
      dataReady: true,
      eligibleRequestIds: ["working-1"],
      requestedRequestId: "stale",
      requestedKind: null,
      requestedTab: "working",
      requestedWorkingFilter: "active",
      requestsByTab,
    });
    assert.deepEqual(populated, {
      requestId: "working-1",
      kind: "customer",
      tab: "working",
      workingFilter: "active",
    });
    assert.equal(
      shouldReplacePrintRequestsPath(
        { requestId: "stale", kind: null, tab: "working", workingFilter: "active" },
        populated!,
      ),
      true,
    );
    assert.equal(
      shouldReplacePrintRequestsPath(
        { requestId: "working-1", kind: null, tab: "working", workingFilter: "active" },
        populated!,
      ),
      false,
    );

    assert.deepEqual(
      resolveCanonicalPrintRequestsRoute({
        dataReady: true,
        eligibleRequestIds: [],
        requestedRequestId: null,
        requestedKind: null,
        requestedTab: "queued",
        requestedWorkingFilter: null,
        requestsByTab,
      }),
      { kind: "customer", tab: "queued" },
    );
  });

  it("makes every explicit Working-filter transition authoritative in one stable route", () => {
    const requestsByFilter = {
      active: ["active-1", "shared"],
      stale: ["stale-1", "shared"],
      empty: ["empty-1"],
      all: ["active-1", "stale-1", "empty-1", "shared", "all-only"],
    } as const;

    for (const sourceFilter of PRINT_REQUEST_WORKING_TRIAGE_FILTERS) {
      for (const destinationFilter of PRINT_REQUEST_WORKING_TRIAGE_FILTERS) {
        if (sourceFilter === destinationFilter) {
          continue;
        }
        for (const currentRequestId of [
          null,
          "shared",
          requestsByFilter[sourceFilter][0] ?? null,
          requestsByFilter[destinationFilter][0] ?? null,
          "all-only",
        ]) {
          const next = resolveWorkingFilterClick({
            currentRequestId,
            destinationFilter,
            destinationRequestIds: requestsByFilter[destinationFilter],
            kind: "customer",
          });
          const expectedRequestId =
            currentRequestId && requestsByFilter[destinationFilter].includes(currentRequestId as never)
              ? currentRequestId
              : requestsByFilter[destinationFilter][0];

          assert.deepEqual(next, {
            ...(expectedRequestId ? { requestId: expectedRequestId } : {}),
            kind: "customer",
            tab: "working",
            workingFilter: destinationFilter,
          });
          assert.equal(
            shouldReplacePrintRequestsPath(
              {
                requestId: next.requestId ?? null,
                kind: "customer",
                tab: next.tab,
                workingFilter: next.workingFilter ?? null,
              },
              next,
            ),
            false,
          );
        }
      }
    }
  });

  it("allows every valid empty Working filter to remain selected", () => {
    for (const workingFilter of PRINT_REQUEST_WORKING_TRIAGE_FILTERS) {
      assert.deepEqual(
        resolveCanonicalPrintRequestsRoute({
          dataReady: true,
          eligibleRequestIds: [],
          requestedRequestId: "not-visible",
          requestedKind: null,
          requestedTab: "working",
          requestedWorkingFilter: workingFilter,
          requestsByTab: {
            working: [{ id: "not-visible" }],
            queued: [],
            printing: [],
            printed: [],
          },
        }),
        { kind: "customer", tab: "working", workingFilter },
      );
    }
  });

  it("preserves history/deep-link filters while normalizing only invalid selections", () => {
    const requestsByTab = {
      working: [{ id: "active-1" }, { id: "empty-1" }],
      queued: [],
      printing: [],
      printed: [],
    };
    const destinations: Array<{
      workingFilter: PrintRequestWorkingTriageFilter;
      eligibleRequestIds: string[];
    }> = [
      { workingFilter: "empty", eligibleRequestIds: ["empty-1"] },
      { workingFilter: "active", eligibleRequestIds: ["active-1"] },
      { workingFilter: "stale", eligibleRequestIds: [] },
    ];

    for (const destination of [...destinations, ...destinations.slice().reverse()]) {
      const resolved = resolveCanonicalPrintRequestsRoute({
        dataReady: true,
        requestedRequestId: "empty-1",
        requestedKind: null,
        requestedTab: "working",
        requestedWorkingFilter: destination.workingFilter,
        requestsByTab,
        eligibleRequestIds: destination.eligibleRequestIds,
      });
      assert.equal(resolved?.workingFilter, destination.workingFilter);
      assert.equal(resolved?.kind, "customer");
      assert.equal(
        resolved?.requestId,
        destination.eligibleRequestIds.includes("empty-1")
          ? "empty-1"
          : destination.eligibleRequestIds[0],
      );
    }
  });

  it("stays stable as item classification resolves and changes", () => {
    const nowMs = Date.UTC(2026, 6, 23);
    const active = resolvePrintRequestWorkingTriageBucket({
      itemCount: 1,
      updatedAtMillis: nowMs,
      nowMs,
    });
    const stale = resolvePrintRequestWorkingTriageBucket({
      itemCount: 1,
      updatedAtMillis: nowMs - 15 * 24 * 60 * 60 * 1000,
      nowMs,
    });
    const empty = resolvePrintRequestWorkingTriageBucket({
      itemCount: 0,
      updatedAtMillis: nowMs,
      nowMs,
    });
    assert.deepEqual({ active, stale, empty }, {
      active: "active",
      stale: "stale",
      empty: "empty",
    });

    const afterFirstItem = resolveWorkingFilterClick({
      currentRequestId: "request-1",
      destinationFilter: "empty",
      destinationRequestIds: [],
      kind: "internal",
    });
    assert.deepEqual(afterFirstItem, {
      kind: "internal",
      tab: "working",
      workingFilter: "empty",
    });

    const afterLastItemRemoved = resolveWorkingFilterClick({
      currentRequestId: "request-1",
      destinationFilter: "active",
      destinationRequestIds: [],
      kind: "customer",
    });
    assert.deepEqual(afterLastItemRemoved, {
      kind: "customer",
      tab: "working",
      workingFilter: "active",
    });
  });

  it("defaults omitted kind to customer and preserves kind=internal in the path", () => {
    assert.equal(resolvePrintRequestListKind(null), "customer");
    assert.equal(resolvePrintRequestListKind("customer"), "customer");
    assert.equal(resolvePrintRequestListKind("internal"), "internal");
    assert.equal(getPrintRequestsPath({ tab: "working" }), "/print-requests?tab=working&workingFilter=active");
    assert.match(
      getPrintRequestsPath({ kind: "internal", tab: "working", requestId: "req-1" }),
      /kind=internal/,
    );
    assert.equal(
      shouldReplacePrintRequestsPath(
        { requestId: "req-1", kind: null, tab: "working", workingFilter: "active" },
        { requestId: "req-1", kind: "internal", tab: "working", workingFilter: "active" },
      ),
      true,
    );
  });
});
