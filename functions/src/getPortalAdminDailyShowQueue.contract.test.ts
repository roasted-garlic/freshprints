import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validatePortalAdminDailyShowQueueRequest } from "./getPortalAdminDailyShowQueue";

describe("getPortalAdminDailyShowQueue input contract", () => {
  it("accepts exactly an empty object", () => {
    assert.deepEqual(validatePortalAdminDailyShowQueueRequest({}), {});
  });

  it("rejects missing, array, and unexpected input", () => {
    for (const input of [undefined, null, [], { dateKey: "2026-01-15" }, { role: "owner" }]) {
      assert.throws(() => validatePortalAdminDailyShowQueueRequest(input));
    }
  });
});
