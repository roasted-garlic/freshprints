import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCustomerIdentityActivityAuditEntry } from "./customerIdentityActivityAudit";

describe("buildCustomerIdentityActivityAuditEntry", () => {
  it("maps merge completed events with survivor/source detail", () => {
    const entry = buildCustomerIdentityActivityAuditEntry({
      id: "evt-1",
      eventType: "account.merge_completed",
      occurredAtMillis: 1_700_000_000_000,
      actorUid: "owner-1",
      metadata: {
        sourceCustomerId: "source-1",
        survivorCustomerId: "survivor-1",
        mergeJobId: "job-1",
        plannedSurvivorUsername: "fresh_prints",
      },
      result: "success",
    });

    assert.equal(entry.label, "Account merge completed");
    assert.match(entry.detail ?? "", /source-1/);
    assert.match(entry.detail ?? "", /survivor-1/);
    assert.match(entry.detail ?? "", /fresh_prints/);
    assert.match(entry.detail ?? "", /job-1/);
  });
});
