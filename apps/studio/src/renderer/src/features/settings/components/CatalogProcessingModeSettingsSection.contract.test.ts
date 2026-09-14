import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./CatalogProcessingModeSettingsSection.tsx", import.meta.url), "utf8");
const modalCss = readFileSync(
  new URL("../../../styles/components/modals.css", import.meta.url),
  "utf8",
);

describe("CatalogProcessingModeSettingsSection", () => {
  it("uses a document-level portal and direct modal dialog child", () => {
    assert.match(source, /createPortal\(/);
    assert.match(source, /document\.body/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /role="dialog"/);
    assert.match(source, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
    assert.match(modalCss, /\.modal-overlay\s*\{[\s\S]*align-items: center;[\s\S]*inset: 0;[\s\S]*justify-content: center;[\s\S]*position: fixed;/);
  });

  it("copies the authoritative phrase without autofilling and keeps exact validation", () => {
    assert.match(source, /ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE/);
    assert.match(source, /navigator\.clipboard\?\.writeText/);
    assert.match(source, /document\.execCommand\("copy"\)/);
    assert.match(source, /setPhraseCopied\(true\)/);
    assert.match(source, /setConfirmationPhrase\(""\)/);
    assert.match(source, /confirmationPhrase !== ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE/);
    assert.match(source, /aria-label=\{phraseCopied/);
  });

  it("uses the shared modal focus containment pattern", () => {
    assert.match(source, /useModalFocusContainment/);
    assert.match(source, /initialFocusRef: confirmationInputRef/);
    assert.match(source, /onEscape: closeLiveModal/);
  });
});
