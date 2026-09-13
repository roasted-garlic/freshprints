import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDuplicateSourcePlaceholderUsername } from "./customerUsernameTransfer";

describe("customerUsernameTransfer helpers", () => {
  it("builds a validated placeholder username from customer id", () => {
    const placeholder = buildDuplicateSourcePlaceholderUsername("cust-abcd1234-5678-90ef");
    assert.match(placeholder, /^dupe-src-[a-z0-9-]+$/);
  });

  it("derives unique suffixes for different customer ids", () => {
    const first = buildDuplicateSourcePlaceholderUsername("11111111-2222-3333-4444-555555555555");
    const second = buildDuplicateSourcePlaceholderUsername("99999999-8888-7777-6666-555555555555");
    assert.notEqual(first, second);
  });
});
