import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static-source / CSS contract for Companion Designs member-card title truncation
 * (`studio-companion-design-card-title-truncation`). Electron-renderer mount is impractical
 * here — assert the shrink-chain and full-title wiring from source, mirroring
 * `CompanionSetPanel.artworkPlacement.test.ts`.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesPath = path.resolve(
  __dirname,
  "../../../styles/components/design-library.css",
);

function readPanelSource(): string {
  return readFileSync(path.join(__dirname, "CompanionSetPanel.tsx"), "utf8");
}

function readStyles(): string {
  return readFileSync(stylesPath, "utf8");
}

function extractRule(css: string, selector: string): string {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `Expected selector ${selector} in design-library.css`);
  const openBrace = css.indexOf("{", start);
  assert.ok(openBrace > start, `Expected '{' after ${selector}`);
  const closeBrace = css.indexOf("}", openBrace);
  assert.ok(closeBrace > openBrace, `Expected '}' for ${selector}`);
  return css.slice(openBrace + 1, closeBrace);
}

describe("CompanionSetPanel member title truncation contract", () => {
  it("constrains the title row to available body width", () => {
    const css = readStyles();
    const body = extractRule(css, ".design-companion-member-body {");
    const titleRow = extractRule(css, ".design-companion-member-title-row {");

    assert.match(body, /align-items:\s*stretch/);
    assert.match(titleRow, /width:\s*100%/);
    assert.match(titleRow, /min-width:\s*0/);
  });

  it("lets the title shrink and take flexible space while keeping ellipsis rules", () => {
    const title = extractRule(readStyles(), ".design-companion-member-title {");

    assert.match(title, /flex:\s*1/);
    assert.match(title, /min-width:\s*0/);
    assert.match(title, /overflow:\s*hidden/);
    assert.match(title, /text-overflow:\s*ellipsis/);
    assert.match(title, /white-space:\s*nowrap/);
    assert.equal(/max-width:\s*\d+px/.test(title), false);
    assert.equal(/width:\s*\d+px/.test(title), false);
  });

  it("keeps the THIS DESIGN badge from shrinking away beside a long title", () => {
    const badge = extractRule(readStyles(), ".design-companion-member-title-row .badge {");
    assert.match(badge, /flex-shrink:\s*0/);
  });

  it("preserves native title={member.title} and placement control markup", () => {
    const source = readPanelSource();

    assert.match(
      source,
      /className="design-companion-member-title"\s+title=\{member\.title\}/,
    );
    assert.match(source, /\{member\.title\}/);
    assert.match(source, /design-companion-member-placement-row/);
    assert.match(source, /<Select/);
    assert.match(source, /design-companion-member-placement-select/);
  });

  it("keeps the member card grid middle column as minmax(0, 1fr)", () => {
    const member = extractRule(readStyles(), ".design-companion-member {");
    assert.match(member, /grid-template-columns:\s*2\.75rem\s+minmax\(0,\s*1fr\)\s+auto/);
  });

  it("does not introduce JS title slicing or multi-line clamp on the member title", () => {
    const source = readPanelSource();
    const title = extractRule(readStyles(), ".design-companion-member-title {");

    assert.equal(source.includes("slice(") && /member\.title\.slice/.test(source), false);
    assert.equal(/-webkit-line-clamp/.test(title), false);
    assert.equal(/white-space:\s*normal/.test(title), false);
  });
});
