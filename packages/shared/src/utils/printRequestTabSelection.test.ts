import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findPrintRequestListTabForRequestId,
  resolveSelectedRequestIdForTab,
} from "./printRequestTabSelection";

test("resolveSelectedRequestIdForTab: keeps the current selection when it is still in the tab", () => {
  assert.equal(resolveSelectedRequestIdForTab("request-1", ["request-1", "request-2"]), "request-1");
});

test("resolveSelectedRequestIdForTab: falls back to the tab's first request when the selection moved out", () => {
  assert.equal(resolveSelectedRequestIdForTab("request-1", ["request-2", "request-3"]), "request-2");
});

test("resolveSelectedRequestIdForTab: clears the selection when the tab is empty", () => {
  assert.equal(resolveSelectedRequestIdForTab("request-1", []), null);
});

test("resolveSelectedRequestIdForTab: selects the first request when there was no prior selection", () => {
  assert.equal(resolveSelectedRequestIdForTab(null, ["request-1", "request-2"]), "request-1");
});

test("resolveSelectedRequestIdForTab: stays null when there was no prior selection and the tab is empty", () => {
  assert.equal(resolveSelectedRequestIdForTab(null, []), null);
});

test("findPrintRequestListTabForRequestId: returns the tab that contains the request", () => {
  assert.equal(
    findPrintRequestListTabForRequestId("request-2", {
      working: [{ id: "request-1" }],
      queued: [{ id: "request-2" }],
      printing: [],
      printed: [],
    }),
    "queued",
  );
});

test("findPrintRequestListTabForRequestId: returns null when the request is missing", () => {
  assert.equal(
    findPrintRequestListTabForRequestId("missing", {
      working: [{ id: "request-1" }],
      queued: [],
      printing: [],
      printed: [],
    }),
    null,
  );
});

test("findPrintRequestListTabForRequestId: returns null for empty ids", () => {
  assert.equal(
    findPrintRequestListTabForRequestId("  ", {
      working: [{ id: "request-1" }],
      queued: [],
      printing: [],
      printed: [],
    }),
    null,
  );
});
