import assert from "node:assert/strict";
import test from "node:test";

import { toSafeStudioUpdateError } from "./studioUpdateErrorMapping";

test("maps an HTTP error with a status code to a safe check-failed message", () => {
  const rawError = Object.assign(new Error("<html>secret cookie stuff Set-Cookie: _gh_sess=abc123</html>"), {
    statusCode: 406,
    code: "HTTP_ERROR_406",
  });

  const safe = toSafeStudioUpdateError(rawError, "check");

  assert.equal(safe.category, "check-failed");
  assert.equal(safe.message, "Unable to check for updates right now. Studio will keep working normally.");
  assert.equal(safe.logHint, "HTTP_406");
  // The raw message text must never leak into any field of the mapped result.
  assert.ok(!JSON.stringify(safe).includes("cookie"));
  assert.ok(!JSON.stringify(safe).includes("_gh_sess"));
  assert.ok(!JSON.stringify(safe).includes("<html>"));
});

test("maps a download HTTP error to a safe download-failed message", () => {
  const rawError = Object.assign(new Error("some raw body"), { statusCode: 500 });
  const safe = toSafeStudioUpdateError(rawError, "download");
  assert.equal(safe.category, "download-failed");
  assert.equal(safe.message, "The update could not be downloaded. Please try again later.");
});

test("maps electron-updater's no-published-versions error safely", () => {
  const rawError = Object.assign(new Error("No published versions on GitHub"), {
    code: "ERR_UPDATER_NO_PUBLISHED_VERSIONS",
  });
  const safe = toSafeStudioUpdateError(rawError, "check");
  assert.equal(safe.category, "no-published-releases");
  assert.equal(safe.logHint, "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
});

test("maps a network error code to a safe network-unavailable message", () => {
  const rawError = Object.assign(new Error("getaddrinfo ENOTFOUND github.com"), { code: "ENOTFOUND" });
  const safe = toSafeStudioUpdateError(rawError, "check");
  assert.equal(safe.category, "network-unavailable");
});

test("falls back to a generic safe message for an error with no structural signal", () => {
  const rawError = new Error(
    "Cannot parse releases feed: TypeError: Cannot read property 'x',\nXML:\n<feed><entry>...full body...</entry></feed>",
  );
  const safe = toSafeStudioUpdateError(rawError, "check");
  assert.equal(safe.category, "unavailable");
  assert.ok(!JSON.stringify(safe).includes("XML"));
  assert.ok(!JSON.stringify(safe).includes("<feed>"));
});

test("handles a non-Error thrown value safely", () => {
  const safe = toSafeStudioUpdateError("just a string, not an Error", "download");
  assert.equal(safe.category, "unavailable");
  assert.equal(typeof safe.message, "string");
});

test("install context maps signature-domain failures to install-failed without leaking raw text", () => {
  const rawError = Object.assign(
    new Error(
      "Code signature at URL file:///Users/secret/Fresh Prints.app/ did not pass validation",
    ),
    { domain: "SQRLCodeSignatureErrorDomain", code: "1" },
  );

  const safe = toSafeStudioUpdateError(rawError, "install");

  assert.equal(safe.category, "install-failed");
  assert.equal(
    safe.message,
    "The update downloaded but could not be installed. Please install the latest Fresh Prints version manually or try again later.",
  );
  assert.equal(safe.logHint, "SQRLCodeSignatureErrorDomain");
  assert.ok(!JSON.stringify(safe).includes("Fresh Prints.app"));
  assert.ok(!JSON.stringify(safe).includes("file://"));
  assert.ok(!JSON.stringify(safe).includes("validation"));
});

test("unknown install failure still uses install-failed copy (not unavailable / check-failed)", () => {
  const rawError = new Error("totally opaque squirrel staging failure with /secret/path");
  const safe = toSafeStudioUpdateError(rawError, "install");

  assert.equal(safe.category, "install-failed");
  assert.match(safe.message, /could not be installed/i);
  assert.equal(safe.logHint, "unknown");
  assert.ok(!JSON.stringify(safe).includes("secret"));
  assert.ok(!JSON.stringify(safe).includes("squirrel"));
});

test("install HTTP errors still use install-failed (not check-failed)", () => {
  const rawError = Object.assign(new Error("body"), { statusCode: 500 });
  const safe = toSafeStudioUpdateError(rawError, "install");
  assert.equal(safe.category, "install-failed");
  assert.equal(safe.logHint, "HTTP_500");
});
