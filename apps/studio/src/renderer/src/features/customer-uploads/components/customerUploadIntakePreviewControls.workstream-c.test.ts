import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
} from "@fresh-prints/shared/constants/design/artworkBackground.constants";

import {
  resolveCustomerUploadBackgroundOverride,
  resolveCustomerUploadPreviewBackgroundHex,
} from "../utils/customerUploadPreviewBackground";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectionSource = readFileSync(path.join(__dirname, "CustomerUploadIntakeSection.tsx"), "utf8");

test("halftone-on defaults Auto backgrounds to Dark in preview resolution", () => {
  assert.equal(
    resolveCustomerUploadPreviewBackgroundHex({
      artworkBackgroundHex: null,
      artworkBackgroundSource: null,
      halftoneOn: true,
    }),
    ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  );
});

test("explicit Light remains Light while halftone stays on", () => {
  assert.equal(
    resolveCustomerUploadPreviewBackgroundHex({
      artworkBackgroundHex: null,
      artworkBackgroundSource: "staff_manual",
      halftoneOn: true,
    }),
    ARTWORK_BACKGROUND_PRESET_GREY,
  );
});

test("explicit Dark remains Dark", () => {
  assert.equal(
    resolveCustomerUploadPreviewBackgroundHex({
      artworkBackgroundHex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      artworkBackgroundSource: "staff_manual",
      halftoneOn: true,
    }),
    ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  );
});

test("background override helper keeps the reviewed Auto/Light/Dark contract", () => {
  assert.equal(resolveCustomerUploadBackgroundOverride(null, null), "auto");
  assert.equal(resolveCustomerUploadBackgroundOverride(null, "staff_manual"), "light");
  assert.equal(
    resolveCustomerUploadBackgroundOverride(
      ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      "staff_manual",
    ),
    "dark",
  );
});

test("intake section wires halftone-on to default dark when background is Auto", () => {
  assert.match(sectionSource, /defaultDarkBackgroundWhenAuto:/);
  assert.match(sectionSource, /resolveCustomerUploadBackgroundOverride/);
  assert.match(sectionSource, /resolveCustomerUploadPreviewBackgroundHex/);
});
