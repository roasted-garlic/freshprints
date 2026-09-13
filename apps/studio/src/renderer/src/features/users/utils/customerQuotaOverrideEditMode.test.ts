import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildQuotaOverrideSavePayload,
  resolveInitialCustomerQuotaOverrideEditMode,
  resolveLinkedSeedValue,
  resolveLinkedValueAfterLeavingIndependent,
} from "./customerQuotaOverrideEditMode";

describe("customerQuotaOverrideEditMode", () => {
  it("defaults to linked when neither dimension is overridden", () => {
    assert.equal(
      resolveInitialCustomerQuotaOverrideEditMode({
        maxQuantityPerPrintRequest: null,
        maxQuantityPerShowPerCustomer: null,
      }),
      "linked",
    );
    assert.equal(
      resolveLinkedSeedValue({
        maxQuantityPerPrintRequest: null,
        maxQuantityPerShowPerCustomer: null,
      }),
      "",
    );
  });

  it("opens linked with shared value when PR and Show match", () => {
    assert.equal(
      resolveInitialCustomerQuotaOverrideEditMode({
        maxQuantityPerPrintRequest: 30,
        maxQuantityPerShowPerCustomer: 30,
      }),
      "linked",
    );
    assert.equal(
      resolveLinkedSeedValue({
        maxQuantityPerPrintRequest: 30,
        maxQuantityPerShowPerCustomer: 30,
      }),
      "30",
    );
  });

  it("opens independent when overrides differ", () => {
    assert.equal(
      resolveInitialCustomerQuotaOverrideEditMode({
        maxQuantityPerPrintRequest: 30,
        maxQuantityPerShowPerCustomer: 40,
      }),
      "independent",
    );
  });

  it("opens independent for PR-only override", () => {
    assert.equal(
      resolveInitialCustomerQuotaOverrideEditMode({
        maxQuantityPerPrintRequest: 30,
        maxQuantityPerShowPerCustomer: null,
      }),
      "independent",
    );
  });

  it("opens independent for Show-only override", () => {
    assert.equal(
      resolveInitialCustomerQuotaOverrideEditMode({
        maxQuantityPerPrintRequest: null,
        maxQuantityPerShowPerCustomer: 35,
      }),
      "independent",
    );
  });

  it("linked save writes both existing dimensions", () => {
    const result = buildQuotaOverrideSavePayload({
      mode: "linked",
      useGlobalLinked: false,
      linkedValue: "30",
      useGlobalPr: true,
      useGlobalShow: true,
      prOverrideInput: "",
      showOverrideInput: "",
    });
    assert.deepEqual(result, {
      ok: true,
      maxQuantityPerPrintRequest: 30,
      maxQuantityPerShowPerCustomer: 30,
    });
  });

  it("linked clear / use global returns both to global", () => {
    const result = buildQuotaOverrideSavePayload({
      mode: "linked",
      useGlobalLinked: true,
      linkedValue: "30",
      useGlobalPr: false,
      useGlobalShow: false,
      prOverrideInput: "30",
      showOverrideInput: "30",
    });
    assert.deepEqual(result, {
      ok: true,
      maxQuantityPerPrintRequest: null,
      maxQuantityPerShowPerCustomer: null,
    });
  });

  it("independent values remain independently editable", () => {
    const result = buildQuotaOverrideSavePayload({
      mode: "independent",
      useGlobalLinked: false,
      linkedValue: "",
      useGlobalPr: false,
      useGlobalShow: true,
      prOverrideInput: "30",
      showOverrideInput: "",
    });
    assert.deepEqual(result, {
      ok: true,
      maxQuantityPerPrintRequest: 30,
      maxQuantityPerShowPerCustomer: null,
    });
  });

  it("switching differing independent values to linked does not silently discard one value", () => {
    const resolved = resolveLinkedValueAfterLeavingIndependent({ pr: 30, show: 40 });
    assert.equal(resolved.linkedValue, "");
    assert.equal(resolved.requiresExplicitLinkedValue, true);
  });

  it("switching equal independent values to linked keeps the shared value", () => {
    const resolved = resolveLinkedValueAfterLeavingIndependent({ pr: 30, show: 30 });
    assert.equal(resolved.linkedValue, "30");
    assert.equal(resolved.requiresExplicitLinkedValue, false);
  });
});
