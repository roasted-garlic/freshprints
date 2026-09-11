import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

test("Portal request item remove uses inline Confirm like Studio", () => {
  const card = readFileSync(join(here, "PortalPrintRequestItemCard.tsx"), "utf8");
  const detail = readFileSync(
    join(here, "../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx"),
    "utf8",
  );
  const css = readFileSync(join(here, "../../../styles/requests.css"), "utf8");
  assert.match(card, /is-confirming-remove/);
  assert.match(card, /isConfirmingRemove/);
  assert.match(card, /<span>Cancel<\/span>/);
  assert.match(card, /isRemoving \? 'Removing…' : 'Confirm'/);
  assert.match(card, /setIsConfirmingRemove\(true\)/);
  assert.doesNotMatch(detail, /Remove design\?/);
  assert.doesNotMatch(detail, /itemPendingRemoval/);
  assert.match(detail, /onRemove=\{\(nextItem\) => void handleRemoveItem\(nextItem\)\}/);
  assert.match(card, /is-removing/);
  assert.match(card, /is-deleting/);
  assert.match(card, /Removing…/);
  assert.match(css, /\.portal-request-item-editor-actions \{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(css, /\.portal-request-item-editor-actions \.portal-button \{[\s\S]*?flex:\s*1 1 0/);
  assert.match(css, /portal-request-item-remove-poof/);
});
