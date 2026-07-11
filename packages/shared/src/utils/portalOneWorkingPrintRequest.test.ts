import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PORTAL_ONE_WORKING_REQUEST_MESSAGE,
  shouldBlockPortalPrintRequestCreate,
} from "./portalOneWorkingPrintRequest";

describe("shouldBlockPortalPrintRequestCreate", () => {
  it("allows create when there are no continuable requests", () => {
    assert.equal(shouldBlockPortalPrintRequestCreate(0), false);
  });

  it("blocks create when any continuable request exists", () => {
    assert.equal(shouldBlockPortalPrintRequestCreate(1), true);
    assert.equal(shouldBlockPortalPrintRequestCreate(3), true);
  });
});

describe("PORTAL_ONE_WORKING_REQUEST_MESSAGE", () => {
  it("is a friendly customer-facing string", () => {
    assert.match(PORTAL_ONE_WORKING_REQUEST_MESSAGE, /already have a request/i);
    assert.match(PORTAL_ONE_WORKING_REQUEST_MESSAGE, /show/i);
  });
});
