import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "../types/printRequest/printRequest.types";

import {
  countPortalEditableContinuableRequests,
  explainPortalPrintRequestEditability,
  filterLegacyContinuablePrintRequests,
  filterPortalEditableContinuablePrintRequests,
  isPortalEditablePrintRequest,
  selectPortalWorkingPrintRequest,
} from "./portalPrintRequestEditability";

function makeRequest(overrides: Partial<PrintRequest> = {}): PrintRequest {
  return {
    id: "pr-1",
    name: "CR-1",
    customerId: "cust-1",
    status: "draft",
    requestOrigin: "portal_customer",
    isInternal: false,
    itemCount: 0,
    queueTab: "working",
    createdAt: { toMillis: () => 1 } as PrintRequest["createdAt"],
    updatedAt: { toMillis: () => 1 } as PrintRequest["updatedAt"],
    ...overrides,
  } as PrintRequest;
}

describe("portalPrintRequestEditability", () => {
  it("treats portal_customer draft/editing as Portal editable", () => {
    assert.equal(isPortalEditablePrintRequest(makeRequest()), true);
    assert.equal(isPortalEditablePrintRequest(makeRequest({ status: "editing" })), true);
  });

  it("rejects studio_customer and internal continuable requests", () => {
    assert.equal(
      isPortalEditablePrintRequest(makeRequest({ requestOrigin: "studio_customer" })),
      false,
    );
    assert.equal(isPortalEditablePrintRequest(makeRequest({ isInternal: true })), false);
  });

  it("splits portal-editable vs legacy continuable requests", () => {
    const requests = [
      makeRequest({ id: "portal", requestOrigin: "portal_customer" }),
      makeRequest({ id: "studio", requestOrigin: "studio_customer" }),
    ];

    assert.deepEqual(
      filterPortalEditableContinuablePrintRequests(requests).map((request) => request.id),
      ["portal"],
    );
    assert.deepEqual(
      filterLegacyContinuablePrintRequests(requests).map((request) => request.id),
      ["studio"],
    );
  });

  it("honors explicit working-request selection over updatedAt ordering", () => {
    const older = makeRequest({
      id: "older",
      updatedAt: { toMillis: () => 10 } as PrintRequest["updatedAt"],
    });
    const newer = makeRequest({
      id: "newer",
      updatedAt: { toMillis: () => 20 } as PrintRequest["updatedAt"],
    });

    assert.equal(
      selectPortalWorkingPrintRequest([older, newer], "older")?.id,
      "older",
    );
    assert.equal(selectPortalWorkingPrintRequest([older, newer], null)?.id, "newer");
  });

  it("explains studio_customer non-editability without implying username issues", () => {
    assert.match(
      explainPortalPrintRequestEditability(makeRequest({ requestOrigin: "studio_customer" })),
      /Studio/,
    );
  });

  it("explains parked draft status with clear user message", () => {
    const message = explainPortalPrintRequestEditability(
      makeRequest({ parkedByEditingRequestId: "pr-editing" })
    );
    assert.match(message, /temporarily parked/);
    assert.match(message, /another request is being edited/);
  });

  it("counts portal-editable continuable requests for create gates", () => {
    const requests = [
      makeRequest({ id: "portal" }),
      makeRequest({ id: "studio", requestOrigin: "studio_customer" }),
    ];
    assert.equal(countPortalEditableContinuableRequests(requests), 1);
  });

  it("selectPortalWorkingPrintRequest excludes parked drafts", () => {
    const activeDraft = makeRequest({
      id: "active",
      updatedAt: { toMillis: () => 10 } as PrintRequest["updatedAt"],
    });
    const parkedDraft = makeRequest({
      id: "parked",
      parkedByEditingRequestId: "pr-editing",
      updatedAt: { toMillis: () => 20 } as PrintRequest["updatedAt"],
    });

    // Even though parked draft has newer updatedAt, it should be excluded
    const selected = selectPortalWorkingPrintRequest([activeDraft, parkedDraft], null);
    assert.equal(selected?.id, "active");
  });

  it("selectPortalWorkingPrintRequest returns null when selected request is parked", () => {
    const parkedDraft = makeRequest({
      id: "parked",
      parkedByEditingRequestId: "pr-editing",
    });

    const selected = selectPortalWorkingPrintRequest([parkedDraft], "parked");
    assert.equal(selected, null);
  });
});
