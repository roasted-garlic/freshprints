import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Edit Design Halftone toggle seeds the default artwork background without removing the field", () => {
  const modalSource = readFileSync(path.join(__dirname, "EditDesignModal.tsx"), "utf8");
  assert.match(
    modalSource,
    /artworkBackgroundPreset: checked \? "lightBlack" : "grey"/,
  );
  assert.match(modalSource, /artworkBackgroundCustomHex: ""/);
  assert.match(modalSource, /<DesignFormFields/);
});

