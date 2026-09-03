import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  type PrintRequestLimitSettings,
} from "../constants/printRequest/printRequestLimitSettings.constants";
import {
  hasActivePrintRequestQuotaOverride,
  parsePrintRequestQuotaOverrideInput,
  resolveEffectivePrintRequestLimits,
  resolvePrintRequestQuotaOverride,
} from "./printRequestQuotaOverride";

const GLOBAL_20: PrintRequestLimitSettings = {
  ...DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  maxQuantityPerPrintRequest: 20,
  maxQuantityPerShowPerCustomer: 20,
};

const GLOBAL_25_30: PrintRequestLimitSettings = {
  ...DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  maxQuantityPerPrintRequest: 25,
  maxQuantityPerShowPerCustomer: 30,
  linkPrintRequestAndCustomerShowLimits: false,
};

const NOW = Date.parse("2026-09-02T18:00:00.000Z");

test("1. no override → global/global", () => {
  const result = resolveEffectivePrintRequestLimits({ settings: GLOBAL_20, nowMs: NOW });
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 20);
  assert.equal(result.effectiveMaxQuantityPerShowPerCustomer, 20);
  assert.equal(result.overrideActive, false);
  assert.equal(result.status, "none");
});

test("2. PR only → override/global", () => {
  const result = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: { maxQuantityPerPrintRequest: 40 },
    nowMs: NOW,
  });
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 40);
  assert.equal(result.effectiveMaxQuantityPerShowPerCustomer, 20);
  assert.equal(result.status, "active");
});

test("3. Show only → global/override", () => {
  const result = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: { maxQuantityPerShowPerCustomer: 50 },
    nowMs: NOW,
  });
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 20);
  assert.equal(result.effectiveMaxQuantityPerShowPerCustomer, 50);
});

test("4. both → override/override", () => {
  const result = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: { maxQuantityPerPrintRequest: 40, maxQuantityPerShowPerCustomer: 50 },
    nowMs: NOW,
  });
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 40);
  assert.equal(result.effectiveMaxQuantityPerShowPerCustomer, 50);
});

test("5–7. expired dimensions / entire override → global", () => {
  const expired = {
    maxQuantityPerPrintRequest: 40,
    maxQuantityPerShowPerCustomer: 50,
    expiresAt: NOW - 1,
  };
  const result = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: expired,
    nowMs: NOW,
  });
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 20);
  assert.equal(result.effectiveMaxQuantityPerShowPerCustomer, 20);
  assert.equal(result.status, "expired");
  assert.equal(result.overrideActive, false);
});

test("8. no expiration remains active", () => {
  const result = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: { maxQuantityPerPrintRequest: 35, expiresAt: null },
    nowMs: NOW,
  });
  assert.equal(result.status, "active");
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 35);
});

test("9. clear one dimension leaves other active (PR null, Show set)", () => {
  const result = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: {
      maxQuantityPerPrintRequest: null,
      maxQuantityPerShowPerCustomer: 45,
    },
    nowMs: NOW,
  });
  assert.equal(result.effectiveMaxQuantityPerPrintRequest, 20);
  assert.equal(result.effectiveMaxQuantityPerShowPerCustomer, 45);
});

test("10–11. changed global used for non-overridden / expired dimensions", () => {
  const activeShowOnly = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_25_30,
    override: { maxQuantityPerShowPerCustomer: 50 },
    nowMs: NOW,
  });
  assert.equal(activeShowOnly.effectiveMaxQuantityPerPrintRequest, 25);
  assert.equal(activeShowOnly.effectiveMaxQuantityPerShowPerCustomer, 50);

  const expiredUsesCurrentGlobal = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_25_30,
    override: {
      maxQuantityPerPrintRequest: 99,
      expiresAt: NOW - 1000,
    },
    nowMs: NOW,
  });
  assert.equal(expiredUsesCurrentGlobal.effectiveMaxQuantityPerPrintRequest, 25);
  assert.equal(expiredUsesCurrentGlobal.effectiveMaxQuantityPerShowPerCustomer, 30);
});

test("12. Customer A override object does not affect unrelated resolve for B", () => {
  const a = resolveEffectivePrintRequestLimits({
    settings: GLOBAL_20,
    override: { maxQuantityPerPrintRequest: 40 },
    nowMs: NOW,
  });
  const b = resolveEffectivePrintRequestLimits({ settings: GLOBAL_20, nowMs: NOW });
  assert.equal(a.effectiveMaxQuantityPerPrintRequest, 40);
  assert.equal(b.effectiveMaxQuantityPerPrintRequest, 20);
});

test("hasActivePrintRequestQuotaOverride is clock-aware", () => {
  assert.equal(
    hasActivePrintRequestQuotaOverride({ maxQuantityPerPrintRequest: 40 }, NOW),
    true,
  );
  assert.equal(
    hasActivePrintRequestQuotaOverride(
      { maxQuantityPerPrintRequest: 40, expiresAt: NOW - 1 },
      NOW,
    ),
    false,
  );
});

test("parsePrintRequestQuotaOverrideInput validates bounds and expiry", () => {
  assert.equal(parsePrintRequestQuotaOverrideInput({ clearAll: true }, NOW)?.clearAll, true);
  assert.deepEqual(
    parsePrintRequestQuotaOverrideInput(
      {
        maxQuantityPerPrintRequest: 40,
        maxQuantityPerShowPerCustomer: null,
        expiresAtMs: NOW + 60_000,
      },
      NOW,
    ),
    {
      maxQuantityPerPrintRequest: 40,
      maxQuantityPerShowPerCustomer: null,
      expiresAtMs: NOW + 60_000,
      clearAll: false,
    },
  );
  assert.equal(
    parsePrintRequestQuotaOverrideInput(
      {
        maxQuantityPerPrintRequest: 40,
        maxQuantityPerShowPerCustomer: null,
        expiresAtMs: NOW - 1,
      },
      NOW,
    ),
    null,
  );
  assert.equal(
    parsePrintRequestQuotaOverrideInput(
      { maxQuantityPerPrintRequest: 0, maxQuantityPerShowPerCustomer: null },
      NOW,
    ),
    null,
  );
});

test("resolvePrintRequestQuotaOverride ignores empty objects", () => {
  assert.equal(resolvePrintRequestQuotaOverride({}), null);
  assert.ok(resolvePrintRequestQuotaOverride({ maxQuantityPerPrintRequest: 30 }));
});
