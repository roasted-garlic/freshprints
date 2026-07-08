import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Customer } from "../types/customer/customer.types";
import {
  getCustomerSignupSourceBadgeLabel,
  getCustomerSignupSourceBadgeVariant,
  resolveCustomerSignupSource,
} from "./customerSignupSource";

describe("resolveCustomerSignupSource", () => {
  it("uses explicit signupSource when present", () => {
    assert.equal(resolveCustomerSignupSource({ signupSource: "portal", userId: undefined }), "portal");
    assert.equal(resolveCustomerSignupSource({ signupSource: "studio", userId: "uid-1" }), "studio");
  });

  it("normalizes legacy studio_invite values to studio", () => {
    assert.equal(
      resolveCustomerSignupSource({ signupSource: "studio_invite" as Customer["signupSource"], userId: "uid-1" }),
      "studio",
    );
  });

  it("infers portal when userId is linked on legacy records", () => {
    assert.equal(resolveCustomerSignupSource({ userId: "uid-1" }), "portal");
  });

  it("infers studio when no userId and no signupSource", () => {
    assert.equal(resolveCustomerSignupSource({}), "studio");
  });
});

describe("getCustomerSignupSourceBadgeLabel", () => {
  it("returns Studio or Portal labels", () => {
    assert.equal(getCustomerSignupSourceBadgeLabel({ signupSource: "studio" }), "Studio");
    assert.equal(getCustomerSignupSourceBadgeLabel({ signupSource: "portal" }), "Portal");
    assert.equal(
      getCustomerSignupSourceBadgeLabel({ signupSource: "studio_invite" as Customer["signupSource"] }),
      "Studio",
    );
  });
});

describe("getCustomerSignupSourceBadgeVariant", () => {
  it("maps signup sources to badge variants", () => {
    assert.equal(getCustomerSignupSourceBadgeVariant({ signupSource: "portal" }), "success");
    assert.equal(getCustomerSignupSourceBadgeVariant({ signupSource: "studio" }), "warning");
    assert.equal(
      getCustomerSignupSourceBadgeVariant({ signupSource: "studio_invite" as Customer["signupSource"] }),
      "warning",
    );
  });
});
