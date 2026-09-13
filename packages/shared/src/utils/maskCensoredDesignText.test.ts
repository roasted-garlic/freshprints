import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  maskCensoredDesignText,
  resolvePortalCensoredDisplayText,
} from "./maskCensoredDesignText";

describe("maskCensoredDesignText", () => {
  it("masks fuck to ****", () => {
    assert.equal(maskCensoredDesignText("fuck", ["fuck"]), "****");
  });

  it("masks FUCK to **** (case-insensitive)", () => {
    assert.equal(maskCensoredDesignText("FUCK", ["fuck"]), "****");
  });

  it("masks mixed-case matches", () => {
    assert.equal(maskCensoredDesignText("FuCk this", ["fuck"]), "**** this");
  });

  it("masks every character of motherfucker", () => {
    assert.equal(maskCensoredDesignText("motherfucker", ["motherfucker"]), "************");
  });

  it("masks phrase eat my ass preserving spaces", () => {
    assert.equal(maskCensoredDesignText("eat my ass", ["eat my ass"]), "*** ** ***");
  });

  it("does not censor ass inside class", () => {
    assert.equal(maskCensoredDesignText("art class today", ["ass"]), "art class today");
  });

  it("masks multiple terms in one string", () => {
    assert.equal(
      maskCensoredDesignText("fuck the motherfucker", ["fuck", "motherfucker"]),
      "**** the ************",
    );
  });

  it("preserves punctuation around a term", () => {
    assert.equal(maskCensoredDesignText("oh fuck!", ["fuck"]), "oh ****!");
    assert.equal(maskCensoredDesignText("(fuck)", ["fuck"]), "(****)");
  });

  it("leaves text unchanged when terms missing or empty", () => {
    assert.equal(maskCensoredDesignText("fuck", undefined), "fuck");
    assert.equal(maskCensoredDesignText("fuck", []), "fuck");
  });

  it("masks automation surface forms f*ck and fucking (not via canonical fuck alone)", () => {
    assert.equal(maskCensoredDesignText("say f*ck now", ["f*ck"]), "say **** now");
    assert.equal(maskCensoredDesignText("stop fucking around", ["fucking"]), "stop ******* around");
    assert.equal(maskCensoredDesignText("stop fucking around", ["fuck"]), "stop fucking around");
  });
});

describe("resolvePortalCensoredDisplayText", () => {
  const terms = ["fuck"];

  it("masks title/description in Censored mode for explicit designs", () => {
    assert.equal(
      resolvePortalCensoredDisplayText({
        text: "fuck yeah",
        isExplicitContent: true,
        censoredTerms: terms,
        showExplicitContent: false,
      }),
      "**** yeah",
    );
  });

  it("restores original text in Uncensored mode", () => {
    assert.equal(
      resolvePortalCensoredDisplayText({
        text: "fuck yeah",
        isExplicitContent: true,
        censoredTerms: terms,
        showExplicitContent: true,
      }),
      "fuck yeah",
    );
  });

  it("does not mask non-explicit designs", () => {
    assert.equal(
      resolvePortalCensoredDisplayText({
        text: "fuck yeah",
        isExplicitContent: false,
        censoredTerms: terms,
        showExplicitContent: false,
      }),
      "fuck yeah",
    );
  });

  it("restores original text when session Click-to-reveal has fired", () => {
    assert.equal(
      resolvePortalCensoredDisplayText({
        text: "fuck yeah",
        isExplicitContent: true,
        censoredTerms: terms,
        showExplicitContent: false,
        sessionRevealed: true,
      }),
      "fuck yeah",
    );
  });

  it("leaves explicit design with no censoredTerms unchanged", () => {
    assert.equal(
      resolvePortalCensoredDisplayText({
        text: "fuck yeah",
        isExplicitContent: true,
        censoredTerms: [],
        showExplicitContent: false,
      }),
      "fuck yeah",
    );
  });
});
