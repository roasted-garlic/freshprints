import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseWhatnotShowUrl } from "./whatnotShowUrl";

describe("parseWhatnotShowUrl", () => {
  it("parses the show ID from a standard Whatnot live show URL and overwrites the referring source", () => {
    const result = parseWhatnotShowUrl(
      "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=profile",
    );

    assert.equal(result?.whatnotShowId, "bf834262-79ee-4c70-8eb9-9da3eb5fe91b");
    assert.equal(
      result?.whatnotUrl,
      "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=fpStudio",
    );
  });

  it("adds referringSource=fpStudio to a URL with no query string", () => {
    const result = parseWhatnotShowUrl("https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b");

    assert.equal(result?.whatnotShowId, "bf834262-79ee-4c70-8eb9-9da3eb5fe91b");
    assert.equal(
      result?.whatnotUrl,
      "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=fpStudio",
    );
  });

  it("trims accidental leading/trailing whitespace before parsing", () => {
    const result = parseWhatnotShowUrl(
      "  https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b  ",
    );

    assert.equal(result?.whatnotShowId, "bf834262-79ee-4c70-8eb9-9da3eb5fe91b");
    assert.equal(
      result?.whatnotUrl,
      "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=fpStudio",
    );
  });

  it("normalizes the parsed show ID to lowercase", () => {
    const result = parseWhatnotShowUrl(
      "https://www.whatnot.com/live/BF834262-79EE-4C70-8EB9-9DA3EB5FE91B",
    );

    assert.equal(result?.whatnotShowId, "bf834262-79ee-4c70-8eb9-9da3eb5fe91b");
  });

  it("returns undefined for blank input", () => {
    assert.equal(parseWhatnotShowUrl(""), undefined);
    assert.equal(parseWhatnotShowUrl("   "), undefined);
  });

  it("returns undefined for a non-Whatnot URL", () => {
    assert.equal(
      parseWhatnotShowUrl("https://www.example.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b"),
      undefined,
    );
  });

  it("returns undefined for a Whatnot URL without a /live/ show ID", () => {
    assert.equal(parseWhatnotShowUrl("https://www.whatnot.com/user/funkyfreshprints/shows"), undefined);
  });

  it("returns undefined for a /live/ path without a valid UUID", () => {
    assert.equal(parseWhatnotShowUrl("https://www.whatnot.com/live/not-a-valid-id"), undefined);
  });

  it("returns undefined for malformed URLs", () => {
    assert.equal(parseWhatnotShowUrl("not a url at all"), undefined);
  });

  it("returns undefined for the DEV-OVERRIDE sentinel", () => {
    assert.equal(parseWhatnotShowUrl("DEV-OVERRIDE"), undefined);
    assert.equal(parseWhatnotShowUrl("  DEV-OVERRIDE  "), undefined);
  });

  it("does not treat partial DEV override tokens as valid", () => {
    assert.equal(parseWhatnotShowUrl("DEV"), undefined);
    assert.equal(parseWhatnotShowUrl("OVERRIDE"), undefined);
    assert.equal(parseWhatnotShowUrl("DEV-OVERRIDE-1"), undefined);
  });
});
