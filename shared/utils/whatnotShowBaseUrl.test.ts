import assert from "node:assert/strict";
import { test } from "node:test";

import { parseWhatnotShowBaseUrl } from "./whatnotShowBaseUrl";

test("parseWhatnotShowBaseUrl: accepts the default base URL", () => {
  const result = parseWhatnotShowBaseUrl("https://www.whatnot.com/user/funkyfreshprints/shows");
  assert.deepEqual(result, {
    normalizedUrl: "https://www.whatnot.com/user/funkyfreshprints/shows",
    username: "funkyfreshprints",
  });
});

test("parseWhatnotShowBaseUrl: accepts a trailing slash", () => {
  const result = parseWhatnotShowBaseUrl("https://www.whatnot.com/user/funkyfreshprints/shows/");
  assert.deepEqual(result, {
    normalizedUrl: "https://www.whatnot.com/user/funkyfreshprints/shows",
    username: "funkyfreshprints",
  });
});

test("parseWhatnotShowBaseUrl: accepts a different valid username", () => {
  const result = parseWhatnotShowBaseUrl("https://www.whatnot.com/user/some_seller-99/shows");
  assert.equal(result?.username, "some_seller-99");
});

test("parseWhatnotShowBaseUrl: trims surrounding whitespace", () => {
  const result = parseWhatnotShowBaseUrl("  https://www.whatnot.com/user/funkyfreshprints/shows  ");
  assert.ok(result);
});

test("parseWhatnotShowBaseUrl: rejects non-HTTPS URLs", () => {
  assert.equal(parseWhatnotShowBaseUrl("http://www.whatnot.com/user/funkyfreshprints/shows"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects non-Whatnot domains", () => {
  assert.equal(parseWhatnotShowBaseUrl("https://www.evil.com/user/funkyfreshprints/shows"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects a bare whatnot.com subdomain other than www", () => {
  assert.equal(parseWhatnotShowBaseUrl("https://whatnot.com/user/funkyfreshprints/shows"), undefined);
  assert.equal(parseWhatnotShowBaseUrl("https://m.whatnot.com/user/funkyfreshprints/shows"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects a query string", () => {
  assert.equal(parseWhatnotShowBaseUrl("https://www.whatnot.com/user/funkyfreshprints/shows?tab=live"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects a fragment", () => {
  assert.equal(parseWhatnotShowBaseUrl("https://www.whatnot.com/user/funkyfreshprints/shows#top"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects a non-default port", () => {
  assert.equal(parseWhatnotShowBaseUrl("https://www.whatnot.com:8443/user/funkyfreshprints/shows"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects an arbitrary Whatnot path", () => {
  assert.equal(parseWhatnotShowBaseUrl("https://www.whatnot.com/some/other/path"), undefined);
  assert.equal(parseWhatnotShowBaseUrl("https://www.whatnot.com/user/funkyfreshprints"), undefined);
  assert.equal(parseWhatnotShowBaseUrl("https://www.whatnot.com/user/funkyfreshprints/shows/extra"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects a single-show /live/ URL used as a base URL", () => {
  assert.equal(
    parseWhatnotShowBaseUrl("https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b"),
    undefined,
  );
});

test("parseWhatnotShowBaseUrl: rejects javascript/data/file schemes", () => {
  assert.equal(parseWhatnotShowBaseUrl("javascript:alert(1)"), undefined);
  assert.equal(parseWhatnotShowBaseUrl("data:text/html,hi"), undefined);
  assert.equal(parseWhatnotShowBaseUrl("file:///etc/passwd"), undefined);
});

test("parseWhatnotShowBaseUrl: rejects blank and malformed input without throwing", () => {
  assert.equal(parseWhatnotShowBaseUrl(""), undefined);
  assert.equal(parseWhatnotShowBaseUrl("   "), undefined);
  assert.equal(parseWhatnotShowBaseUrl("not a url"), undefined);
});
