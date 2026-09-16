import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS,
  isEmailInPortalDevCustomerAccessAllowlist,
  normalizePortalDevCustomerAccessEmail,
  normalizePortalDevCustomerAccessEmails,
  parsePortalDevCustomerAccessSettingsInput,
  resolvePortalDevCustomerAccessSettings,
} from "./portalDevCustomerAccess.constants";

describe("portalDevCustomerAccess constants", () => {
  it("normalizes email case and whitespace", () => {
    assert.equal(normalizePortalDevCustomerAccessEmail("  Owner@Example.COM  "), "owner@example.com");
    assert.equal(normalizePortalDevCustomerAccessEmail(""), "");
    assert.equal(normalizePortalDevCustomerAccessEmail(null), "");
  });

  it("deduplicates and drops invalid approved emails", () => {
    assert.deepEqual(
      normalizePortalDevCustomerAccessEmails([
        "  A@Example.com ",
        "a@example.com",
        "b@example.com",
        "",
        "not-an-email",
        "@missing-local",
        "missing-domain@",
        42,
      ]),
      ["a@example.com", "b@example.com"],
    );
  });

  it("parses canonical input and rejects oversized or invalid lists", () => {
    assert.deepEqual(parsePortalDevCustomerAccessSettingsInput({ approvedEmails: ["  X@Y.com "] }), {
      approvedEmails: ["x@y.com"],
    });
    assert.equal(parsePortalDevCustomerAccessSettingsInput({ approvedEmails: "x@y.com" }), null);
    assert.equal(parsePortalDevCustomerAccessSettingsInput({ approvedEmails: [42] }), null);
    assert.equal(
      parsePortalDevCustomerAccessSettingsInput({
        approvedEmails: Array.from({ length: PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS + 1 }, (_, i) =>
          `user${i}@example.com`,
        ),
      }),
      null,
    );
  });

  it("resolves missing settings to an empty allowlist", () => {
    assert.deepEqual(resolvePortalDevCustomerAccessSettings(undefined), { approvedEmails: [] });
    assert.deepEqual(resolvePortalDevCustomerAccessSettings({ approvedEmails: ["A@B.com"] }), {
      approvedEmails: ["a@b.com"],
    });
  });

  it("membership checks use normalized comparison", () => {
    assert.equal(
      isEmailInPortalDevCustomerAccessAllowlist(["tester@example.com"], "  Tester@Example.com "),
      true,
    );
    assert.equal(
      isEmailInPortalDevCustomerAccessAllowlist(["tester@example.com"], "other@example.com"),
      false,
    );
  });
});
