import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "../types/printRequest/printRequest.types";

import {
  countPortalActiveEditablePrintRequests,
  filterPortalActiveEditablePrintRequests,
  filterPortalParkedDrafts,
  isPortalActiveEditablePrintRequest,
  isPortalParkedDraft,
  PORTAL_PARKED_DRAFT_INACTIVE_MESSAGE,
  PORTAL_PARKED_DRAFT_MUTATION_REJECTED_MESSAGE,
  selectPortalActiveEditablePrintRequest,
} from "./portalActiveEditablePrintRequest";

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
    createdBy: "user-1",
    updatedBy: "user-1",
    ...overrides,
  } as PrintRequest;
}

describe("portalActiveEditablePrintRequest", () => {
  describe("constants", () => {
    it("provides user-facing parked draft messages", () => {
      assert.match(PORTAL_PARKED_DRAFT_INACTIVE_MESSAGE, /temporarily inactive/i);
      assert.match(PORTAL_PARKED_DRAFT_MUTATION_REJECTED_MESSAGE, /temporarily inactive/i);
    });
  });

  describe("isPortalParkedDraft", () => {
    it("identifies parked drafts with parkedByEditingRequestId", () => {
      assert.equal(isPortalParkedDraft({ 
        status: "draft", 
        parkedByEditingRequestId: "pr-editing" 
      }), true);
    });

    it("rejects non-draft status even with parkedByEditingRequestId", () => {
      assert.equal(isPortalParkedDraft({ 
        status: "editing", 
        parkedByEditingRequestId: "pr-editing" 
      }), false);
      assert.equal(isPortalParkedDraft({ 
        status: "active", 
        parkedByEditingRequestId: "pr-editing" 
      }), false);
    });

    it("rejects draft without parkedByEditingRequestId", () => {
      assert.equal(isPortalParkedDraft({ 
        status: "draft", 
        parkedByEditingRequestId: undefined 
      }), false);
      assert.equal(isPortalParkedDraft({ 
        status: "draft", 
        parkedByEditingRequestId: "" 
      }), false);
      assert.equal(isPortalParkedDraft({ 
        status: "draft", 
        parkedByEditingRequestId: "   " 
      }), false);
    });
  });

  describe("isPortalActiveEditablePrintRequest", () => {
    it("accepts portal_customer draft without parking", () => {
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest()), true);
    });

    it("accepts portal_customer editing status", () => {
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest({ 
        status: "editing" 
      })), true);
    });

    it("rejects parked drafts", () => {
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest({ 
        parkedByEditingRequestId: "pr-editing" 
      })), false);
    });

    it("rejects studio_customer origin", () => {
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest({ 
        requestOrigin: "studio_customer" 
      })), false);
    });

    it("rejects internal requests", () => {
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest({ 
        isInternal: true 
      })), false);
    });

    it("rejects non-continuable statuses", () => {
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest({ 
        status: "active" 
      })), false);
      assert.equal(isPortalActiveEditablePrintRequest(makeRequest({ 
        status: "completed" 
      })), false);
    });
  });

  describe("filterPortalActiveEditablePrintRequests", () => {
    it("excludes parked drafts while including active ones", () => {
      const requests = [
        makeRequest({ id: "active-draft", status: "draft" }),
        makeRequest({ id: "parked-draft", status: "draft", parkedByEditingRequestId: "pr-editing" }),
        makeRequest({ id: "editing", status: "editing" }),
        makeRequest({ id: "studio", requestOrigin: "studio_customer" }),
      ];

      const active = filterPortalActiveEditablePrintRequests(requests);
      assert.deepEqual(active.map(r => r.id), ["active-draft", "editing"]);
    });
  });

  describe("filterPortalParkedDrafts", () => {
    it("returns only parked drafts", () => {
      const requests = [
        makeRequest({ id: "active-draft", status: "draft" }),
        makeRequest({ id: "parked-draft", status: "draft", parkedByEditingRequestId: "pr-editing" }),
        makeRequest({ id: "editing", status: "editing" }),
      ];

      const parked = filterPortalParkedDrafts(requests);
      assert.deepEqual(parked.map(r => r.id), ["parked-draft"]);
    });
  });

  describe("selectPortalActiveEditablePrintRequest", () => {
    it("prefers editing status over unparked drafts", () => {
      const draftRequest = makeRequest({
        id: "draft",
        status: "draft",
        updatedAt: { toMillis: () => 20 } as PrintRequest["updatedAt"],
      });
      const editingRequest = makeRequest({
        id: "editing",
        status: "editing",
        updatedAt: { toMillis: () => 10 } as PrintRequest["updatedAt"],
      });

      const selected = selectPortalActiveEditablePrintRequest([draftRequest, editingRequest], null);
      assert.equal(selected?.id, "editing");
    });

    it("honors explicit selection over status priority", () => {
      const draftRequest = makeRequest({
        id: "draft",
        status: "draft",
        updatedAt: { toMillis: () => 20 } as PrintRequest["updatedAt"],
      });
      const editingRequest = makeRequest({
        id: "editing",
        status: "editing",
        updatedAt: { toMillis: () => 10 } as PrintRequest["updatedAt"],
      });

      const selected = selectPortalActiveEditablePrintRequest([draftRequest, editingRequest], "draft");
      assert.equal(selected?.id, "draft");
    });

    it("excludes parked drafts from selection", () => {
      const activeDraft = makeRequest({
        id: "active-draft",
        status: "draft",
        updatedAt: { toMillis: () => 20 } as PrintRequest["updatedAt"],
      });
      const parkedDraft = makeRequest({
        id: "parked-draft",
        status: "draft",
        parkedByEditingRequestId: "pr-editing",
        updatedAt: { toMillis: () => 30 } as PrintRequest["updatedAt"],
      });

      // Even though parked-draft has newer updatedAt, it should be excluded
      const selected = selectPortalActiveEditablePrintRequest([activeDraft, parkedDraft], null);
      assert.equal(selected?.id, "active-draft");
    });

    it("returns null when selected ID is parked", () => {
      const parkedDraft = makeRequest({
        id: "parked-draft",
        status: "draft",
        parkedByEditingRequestId: "pr-editing",
      });

      const selected = selectPortalActiveEditablePrintRequest([parkedDraft], "parked-draft");
      assert.equal(selected, null);
    });

    it("falls back to newest active request by updatedAt", () => {
      const olderRequest = makeRequest({
        id: "older",
        updatedAt: { toMillis: () => 10 } as PrintRequest["updatedAt"],
      });
      const newerRequest = makeRequest({
        id: "newer",
        updatedAt: { toMillis: () => 20 } as PrintRequest["updatedAt"],
      });

      const selected = selectPortalActiveEditablePrintRequest([olderRequest, newerRequest], null);
      assert.equal(selected?.id, "newer");
    });

    it("returns null when no active requests exist", () => {
      const parkedDraft = makeRequest({
        id: "parked",
        parkedByEditingRequestId: "pr-editing",
      });
      const studioRequest = makeRequest({
        id: "studio",
        requestOrigin: "studio_customer",
      });

      const selected = selectPortalActiveEditablePrintRequest([parkedDraft, studioRequest], null);
      assert.equal(selected, null);
    });
  });

  describe("countPortalActiveEditablePrintRequests", () => {
    it("counts only active editable requests", () => {
      const requests = [
        makeRequest({ id: "active-draft" }),
        makeRequest({ id: "parked-draft", parkedByEditingRequestId: "pr-editing" }),
        makeRequest({ id: "editing", status: "editing" }),
        makeRequest({ id: "studio", requestOrigin: "studio_customer" }),
      ];

      assert.equal(countPortalActiveEditablePrintRequests(requests), 2);
    });

    it("returns zero when all requests are parked or non-portal", () => {
      const requests = [
        makeRequest({ id: "parked", parkedByEditingRequestId: "pr-editing" }),
        makeRequest({ id: "studio", requestOrigin: "studio_customer" }),
        makeRequest({ id: "internal", isInternal: true }),
      ];

      assert.equal(countPortalActiveEditablePrintRequests(requests), 0);
    });
  });
});