import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST,
  CUSTOMER_UPLOAD_GUEST_SENTINEL,
} from "./customerUploadGuest.constants";

describe("customerUploadGuest.constants", () => {
  it("uses a stable guest sentinel string", () => {
    assert.equal(CUSTOMER_UPLOAD_GUEST_SENTINEL, "guest");
  });

  it("caps guest donation finalize images below registered default", () => {
    assert.equal(CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST, 20);
    assert.ok(CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST < 1000);
  });
});
