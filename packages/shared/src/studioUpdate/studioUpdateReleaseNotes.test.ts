import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStudioReleaseNotes } from "./studioUpdateReleaseNotes";

test("converts GitHub paragraph HTML into readable plain text", () => {
  const html = "<p>This release adds automatic updates.</p><p>Also fixes a login bug.</p>";
  const result = normalizeStudioReleaseNotes(html);
  assert.equal(result, "This release adds automatic updates.\n\nAlso fixes a login bug.");
});

test("anchor tags become their visible text, not raw markup", () => {
  const html = '<p>See <a href="https://github.com/roasted-garlic/freshprints/pull/29">PR #29</a> for details.</p>';
  const result = normalizeStudioReleaseNotes(html);
  assert.ok(result);
  assert.ok(!result.includes("<a"));
  assert.ok(!result.includes("href"));
  assert.ok(result.includes("PR #29"));
});

test("line breaks, list items, and headings remain understandable", () => {
  const html = "<h2>Changes</h2><ul><li>Fix A</li><li>Fix B</li></ul><p>Line one<br>Line two</p>";
  const result = normalizeStudioReleaseNotes(html);
  assert.ok(result);
  assert.ok(result.includes("Fix A"));
  assert.ok(result.includes("Fix B"));
  assert.ok(result.includes("• Fix A") || result.includes("Fix A"));
  assert.ok(result.includes("Line one\nLine two"));
});

test("common HTML entities are decoded", () => {
  const html = "<p>Fresh Prints &amp; Studio &mdash; &lt;beta&gt; release &#39;quoted&#39;</p>".replace(
    "&mdash;",
    "&#8212;",
  );
  const result = normalizeStudioReleaseNotes(html);
  assert.ok(result);
  assert.ok(result.includes("Fresh Prints & Studio"));
  assert.ok(result.includes("<beta>"));
  assert.ok(result.includes("'quoted'"));
});

test("script and style content cannot survive into plain text", () => {
  const html = '<p>Safe text</p><script>alert("xss")</script><style>body{color:red}</style>';
  const result = normalizeStudioReleaseNotes(html);
  assert.ok(result);
  assert.ok(!result.includes("alert"));
  assert.ok(!result.includes("color:red"));
  assert.ok(!result.includes("<script"));
  assert.equal(result, "Safe text");
});

test("empty or whitespace-only markup returns null", () => {
  assert.equal(normalizeStudioReleaseNotes(""), null);
  assert.equal(normalizeStudioReleaseNotes("   "), null);
  assert.equal(normalizeStudioReleaseNotes("<p></p>"), null);
  assert.equal(normalizeStudioReleaseNotes(null), null);
  assert.equal(normalizeStudioReleaseNotes(undefined), null);
});

test("excessive whitespace and blank lines are normalized", () => {
  const html = "<p>First</p>\n\n\n\n<p>Second</p>";
  const result = normalizeStudioReleaseNotes(html);
  assert.equal(result, "First\n\nSecond");
});

test("output longer than 2000 characters is truncated with a trailing ellipsis", () => {
  const longParagraph = "A".repeat(2500);
  const html = `<p>${longParagraph}</p>`;
  const result = normalizeStudioReleaseNotes(html);
  assert.ok(result);
  assert.equal(result.length, 2001);
  assert.ok(result.endsWith("…"));
  assert.equal(result.slice(0, 2000), longParagraph.slice(0, 2000));
});

test("raw tags never appear in the output for a representative real-world sample", () => {
  const html = `
    <h2>What's Changed</h2>
    <ul>
      <li>Fix crash on launch by <a href="https://github.com/someone">@someone</a> in <a href="#">#12</a></li>
      <li>Add <code>--dry-run</code> flag</li>
    </ul>
    <p><strong>Full Changelog</strong>: <a href="#">v1.0.0-beta.2...v1.0.0-beta.3</a></p>
  `;
  const result = normalizeStudioReleaseNotes(html);
  assert.ok(result);
  for (const tag of ["<p", "<a", "<script", "<style", "<div", "<h2", "<ul", "<li", "<code", "<strong"]) {
    assert.ok(!result.includes(tag), `expected output to not contain ${tag}`);
  }
});

test("supports the array-of-per-version-notes shape electron-updater may return", () => {
  const raw = [
    { version: "1.0.0-beta.3", note: "<p>Beta 3 notes</p>" },
    { version: "1.0.0-beta.2", note: "<p>Beta 2 notes</p>" },
  ];
  const result = normalizeStudioReleaseNotes(raw);
  assert.ok(result);
  assert.ok(result.includes("Beta 3 notes"));
  assert.ok(result.includes("Beta 2 notes"));
});

test("array shape with all-null/empty notes returns null", () => {
  const raw = [
    { version: "1.0.0-beta.3", note: null },
    { version: "1.0.0-beta.2", note: "" },
  ];
  assert.equal(normalizeStudioReleaseNotes(raw), null);
});

test("plain non-HTML text passes through, entity-decoded and trimmed", () => {
  const result = normalizeStudioReleaseNotes("  Just a plain release note.  ");
  assert.equal(result, "Just a plain release note.");
});
