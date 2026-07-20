import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT,
  PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
} from "./printRequestLimitDefaults.constants";
import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  parsePrintRequestLimitSettingsInput,
  printRequestLimitL,
  resolvePrintRequestLimitSettings,
} from "./printRequestLimitSettings.constants";

describe("printRequestLimitSettings", () => {
  it("defaults match code constants; L is maxQuantityPerShowPerCustomer", () => {
    assert.equal(
      DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.maxQuantityPerShowPerCustomer,
      PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
    );
    assert.equal(
      DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.dailyDesignsAddedToRequestsLimit,
      PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT,
    );
    assert.equal(PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER, 20);
    assert.equal(printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS), 20);
  });

  it("resolve uses L from maxQuantityPerShowPerCustomer; Cap A is not required for L", () => {
    const resolved = resolvePrintRequestLimitSettings({
      maxQuantityPerShowPerCustomer: 25,
    });
    assert.equal(resolved.maxQuantityPerShowPerCustomer, 25);
    // Missing Cap A mirrors L for compat display.
    assert.equal(resolved.dailyDesignsAddedToRequestsLimit, 25);
    assert.equal(printRequestLimitL(resolved), 25);
  });

  it("resolve falls back invalid L; keeps valid Cap A only as legacy field", () => {
    const resolved = resolvePrintRequestLimitSettings({
      dailyDesignsAddedToRequestsLimit: 40,
      maxQuantityPerShowPerCustomer: "nope",
    });
    assert.equal(resolved.dailyDesignsAddedToRequestsLimit, 40);
    assert.equal(
      resolved.maxQuantityPerShowPerCustomer,
      PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
    );
    assert.equal(printRequestLimitL(resolved), PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER);
  });

  it("parse requires only L and mirrors into legacy Cap A", () => {
    assert.equal(parsePrintRequestLimitSettingsInput(null), null);
    assert.equal(
      parsePrintRequestLimitSettingsInput({
        maxQuantityPerShowPerCustomer: 0,
      }),
      null,
    );
    const ok = parsePrintRequestLimitSettingsInput({
      maxQuantityPerShowPerCustomer: 25,
    });
    assert.deepEqual(ok, {
      maxQuantityPerShowPerCustomer: 25,
      dailyDesignsAddedToRequestsLimit: 25,
    });
  });

  it("parse ignores mismatched Cap A and mirrors L", () => {
    const ok = parsePrintRequestLimitSettingsInput({
      dailyDesignsAddedToRequestsLimit: 99,
      maxQuantityPerShowPerCustomer: 25,
    });
    assert.deepEqual(ok, {
      maxQuantityPerShowPerCustomer: 25,
      dailyDesignsAddedToRequestsLimit: 25,
    });
  });
});
