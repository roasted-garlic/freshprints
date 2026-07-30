/**
 * Source-presence proof for the corrected historical-show customer-facing copy (Plan Section 29.6).
 * The two call sites carrying this string (`PortalQueueToShowModal.tsx`'s rendered callout and
 * `packages/show-picker/src/ShowPicker.tsx`'s `aria-description`, both confirmed customer-facing by
 * the Amendment 11 Formal Review) have no DOM-rendering test harness in this repo
 * (docs/standards/TESTING.md), so this supplements — never substitutes for — behavior-level evidence
 * elsewhere in this goal's test suite. It exists specifically to prevent the old "read-only" wording
 * from silently reappearing in either location.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modalSource = readFileSync(join(here, "PortalQueueToShowModal.tsx"), "utf8");
const showPickerSource = readFileSync(
  join(here, "../../../../..", "packages/show-picker/src/ShowPicker.tsx"),
  "utf8",
);

describe("Historical-show customer-facing copy (Plan Section 29.6)", () => {
  it("PortalQueueToShowModal renders the exact new copy", () => {
    assert.match(
      modalSource,
      /This show has already been printed, so no new print requests can be added\./,
    );
    assert.match(modalSource, /You can still review your print activity for this show\./);
  });

  it("the old 'Read-only show' string no longer appears in PortalQueueToShowModal", () => {
    assert.equal(/Read-only show/i.test(modalSource), false);
  });

  it("ShowPicker's aria-description no longer says 'Read-only show' either", () => {
    assert.equal(/Read-only show/i.test(showPickerSource), false);
  });

  it("ShowPicker's aria-description uses equivalent non-'read-only' wording", () => {
    assert.match(showPickerSource, /This show has already been printed\. Not available for adding\./);
  });
});
