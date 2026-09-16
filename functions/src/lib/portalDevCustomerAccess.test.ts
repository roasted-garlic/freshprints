import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  decidePortalDevCustomerAccess,
  isPortalDevCustomerAccessEnforcementEnabled,
  resolvePortalDevCustomerAccessProjectId,
} from "./portalDevCustomerAccess";

const originalGcloud = process.env.GCLOUD_PROJECT;
const originalGcp = process.env.GCP_PROJECT;

afterEach(() => {
  if (originalGcloud === undefined) {
    delete process.env.GCLOUD_PROJECT;
  } else {
    process.env.GCLOUD_PROJECT = originalGcloud;
  }
  if (originalGcp === undefined) {
    delete process.env.GCP_PROJECT;
  } else {
    process.env.GCP_PROJECT = originalGcp;
  }
});

describe("portalDevCustomerAccess project gate", () => {
  it("enforces only on fresh-prints-dev (GCLOUD_PROJECT)", () => {
    process.env.GCLOUD_PROJECT = "fresh-prints-dev";
    delete process.env.GCP_PROJECT;
    assert.equal(isPortalDevCustomerAccessEnforcementEnabled(), true);
    assert.equal(resolvePortalDevCustomerAccessProjectId(), "fresh-prints-dev");
  });

  it("also recognizes GCP_PROJECT when GCLOUD_PROJECT is unset", () => {
    delete process.env.GCLOUD_PROJECT;
    process.env.GCP_PROJECT = "fresh-prints-dev";
    assert.equal(isPortalDevCustomerAccessEnforcementEnabled(), true);
  });

  it("short-circuits on production project ids", () => {
    process.env.GCLOUD_PROJECT = "fresh-prints-prod";
    delete process.env.GCP_PROJECT;
    assert.equal(isPortalDevCustomerAccessEnforcementEnabled(), false);

    process.env.GCLOUD_PROJECT = "fresh-prints";
    assert.equal(isPortalDevCustomerAccessEnforcementEnabled(), false);
  });

  it("short-circuits when project id is missing", () => {
    delete process.env.GCLOUD_PROJECT;
    delete process.env.GCP_PROJECT;
    assert.equal(isPortalDevCustomerAccessEnforcementEnabled(), false);
  });
});

describe("decidePortalDevCustomerAccess", () => {
  it("allows everyone when enforcement is disabled (production short-circuit)", () => {
    assert.deepEqual(
      decidePortalDevCustomerAccess({
        enforcementEnabled: false,
        email: "anyone@example.com",
        approvedEmails: [],
      }),
      { allowed: true },
    );
  });

  it("allows staff roles without consulting the allowlist", () => {
    for (const role of ["owner", "admin", "helper"]) {
      assert.deepEqual(
        decidePortalDevCustomerAccess({
          enforcementEnabled: true,
          role,
          email: "staff@example.com",
          approvedEmails: [],
        }),
        { allowed: true },
        role,
      );
    }
  });

  it("allows approved customer emails and denies others", () => {
    assert.deepEqual(
      decidePortalDevCustomerAccess({
        enforcementEnabled: true,
        role: "customer",
        email: "  Tester@Example.com ",
        approvedEmails: ["tester@example.com"],
      }),
      { allowed: true },
    );
    assert.deepEqual(
      decidePortalDevCustomerAccess({
        enforcementEnabled: true,
        role: "customer",
        email: "other@example.com",
        approvedEmails: ["tester@example.com"],
      }),
      { allowed: false },
    );
    assert.deepEqual(
      decidePortalDevCustomerAccess({
        enforcementEnabled: true,
        email: "",
        approvedEmails: ["tester@example.com"],
      }),
      { allowed: false },
    );
  });
});
