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
  printRequestLimitPerCustomerPerShow,
  printRequestLimitPerRequest,
  resolvePrintRequestLimitSettings,
} from "./printRequestLimitSettings.constants";

describe("printRequestLimitSettings", () => {
  it("defaults are linked with equal request and customer-show limits", () => {
    assert.equal(
      DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.maxQuantityPerShowPerCustomer,
      PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
    );
    assert.equal(
      DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.maxQuantityPerPrintRequest,
      PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
    );
    assert.equal(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.linkPrintRequestAndCustomerShowLimits, true);
    assert.equal(
      DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.dailyDesignsAddedToRequestsLimit,
      PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT,
    );
    assert.equal(printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS), 20);
    assert.equal(printRequestLimitPerRequest(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS), 20);
  });

  it("missing new fields fall back to linked sole-L behavior", () => {
    const resolved = resolvePrintRequestLimitSettings({
      maxQuantityPerShowPerCustomer: 30,
    });
    assert.equal(resolved.maxQuantityPerShowPerCustomer, 30);
    assert.equal(resolved.maxQuantityPerPrintRequest, 30);
    assert.equal(resolved.linkPrintRequestAndCustomerShowLimits, true);
    assert.equal(resolved.dailyDesignsAddedToRequestsLimit, 30);
  });

  it("resolves independent values when unlinked fields are present", () => {
    const resolved = resolvePrintRequestLimitSettings({
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 30,
      linkPrintRequestAndCustomerShowLimits: false,
    });
    assert.equal(printRequestLimitPerRequest(resolved), 25);
    assert.equal(printRequestLimitPerCustomerPerShow(resolved), 30);
    assert.equal(resolved.linkPrintRequestAndCustomerShowLimits, false);
  });

  it("parse linked save persists equal numerics and mirrors Cap A from request limit", () => {
    const ok = parsePrintRequestLimitSettingsInput({
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 99,
      linkPrintRequestAndCustomerShowLimits: true,
    });
    assert.deepEqual(ok, {
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 25,
      linkPrintRequestAndCustomerShowLimits: true,
      dailyDesignsAddedToRequestsLimit: 25,
    });
  });

  it("parse legacy sole-L shape remains valid and linked", () => {
    const ok = parsePrintRequestLimitSettingsInput({
      maxQuantityPerShowPerCustomer: 25,
    });
    assert.deepEqual(ok, {
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 25,
      linkPrintRequestAndCustomerShowLimits: true,
      dailyDesignsAddedToRequestsLimit: 25,
    });
  });

  it("parse unlinked requires both fields and preserves independence", () => {
    assert.equal(
      parsePrintRequestLimitSettingsInput({
        maxQuantityPerPrintRequest: 25,
        linkPrintRequestAndCustomerShowLimits: false,
      }),
      null,
    );
    const ok = parsePrintRequestLimitSettingsInput({
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 30,
      linkPrintRequestAndCustomerShowLimits: false,
    });
    assert.deepEqual(ok, {
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 30,
      linkPrintRequestAndCustomerShowLimits: false,
      dailyDesignsAddedToRequestsLimit: 25,
    });
  });

  it("linked equal values preserve pre-change sole-L enforcement accessors", () => {
    const resolved = resolvePrintRequestLimitSettings({
      maxQuantityPerPrintRequest: 25,
      maxQuantityPerShowPerCustomer: 25,
      linkPrintRequestAndCustomerShowLimits: true,
    });
    assert.equal(printRequestLimitL(resolved), 25);
    assert.equal(printRequestLimitPerRequest(resolved), 25);
    assert.equal(printRequestLimitPerCustomerPerShow(resolved), 25);
  });
});
