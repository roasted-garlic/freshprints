import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./PortalMaintenanceSettingsSection.tsx", import.meta.url), "utf8");

test("maintenance Settings uses the established copy form primitives", () => {
  assert.match(source, /Maintenance heading/);
  assert.match(source, /settings-text-input/);
  assert.match(source, /Maintenance message/);
  assert.match(source, /settings-textarea-input/);
  assert.match(source, /settings-field-label/);
  assert.match(source, /settings-field-hint/);
  assert.match(source, /settings-form-actions/);
  assert.match(source, /<Toggle/);
  assert.match(source, /<Select[\s\S]*searchable/);
  assert.match(source, /<Button/);
});

test("maintenance tester options come from the trusted candidate list and preserve UID values", () => {
  assert.match(source, /listTestCustomers\(\)/);
  assert.match(source, /value: customer\.uid/);
  assert.match(source, /Configured account unavailable — clear to remove/);
  assert.match(source, /disabled: true/);
  assert.match(source, /maintenanceTestCustomerUid: event\.target\.value \|\| null/);
  assert.doesNotMatch(source, /useCustomersDirectory/);
});
