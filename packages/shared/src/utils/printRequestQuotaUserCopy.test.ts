import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatShowCustomerLimitUserMessage } from "./printRequestQuotaUserCopy";

describe("printRequestQuotaUserCopy", () => {
  it("show customer limit message is spots-exhausted copy", () => {
    const msg = formatShowCustomerLimitUserMessage(25);
    assert.equal(
      msg,
      "You've used all 25 of your print spots on this show. Choose another show for more designs.",
    );
    assert.doesNotMatch(msg, /already have a (print )?request|—|Cap A|Cap B|remainder|midnight/i);
  });

  it("defaults to 25 when cap is missing", () => {
    assert.match(formatShowCustomerLimitUserMessage(null), /all 25 of your print spots/);
    assert.match(formatShowCustomerLimitUserMessage(undefined), /all 25 of your print spots/);
  });
});
