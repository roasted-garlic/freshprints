import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validatePortalUsernameInput } from '../../auth/components/PortalUsernameField';

describe("portal account profile validation", () => {
  it("accepts valid usernames", () => {
    assert.equal(validatePortalUsernameInput("alexs"), null);
  });

  it("rejects invalid usernames", () => {
    assert.match(validatePortalUsernameInput("!!") ?? "", /3-32 characters/i);
  });
});
