import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./PortalDevCustomerAccessSettingsSection.tsx", import.meta.url),
  "utf8",
);

test("DEV customer access Settings uses established form primitives", () => {
  assert.match(source, /Portal DEV customer access/);
  assert.match(source, /settings-text-input/);
  assert.match(source, /settings-field-label/);
  assert.match(source, /settings-field-hint/);
  assert.match(source, /settings-form-actions/);
  assert.match(source, /<Button/);
  assert.match(source, /canManageSettings/);
  assert.doesNotMatch(source, /@fresh-prints\.com/);
  assert.doesNotMatch(source, /hard-?coded/i);
});

test("DEV customer access Settings loads via hook/callable path", () => {
  assert.match(source, /usePortalDevCustomerAccessSettings/);
  const serviceSource = readFileSync(
    new URL("../services/portalDevCustomerAccessSettingsService.ts", import.meta.url),
    "utf8",
  );
  assert.match(serviceSource, /getPortalDevCustomerAccessSettings/);
  assert.match(serviceSource, /updatePortalDevCustomerAccessSettings/);
  assert.doesNotMatch(serviceSource, /onSnapshot/);
});
