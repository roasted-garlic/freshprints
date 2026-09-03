import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  looksLikeMeaningfulPrimaryText,
  looksLikeOcrDumpTitle,
  looksLikeTranscriptionNoise,
  sanitizeMeaningfulVisibleTextPhrases,
  stripOcrDumpFromDescription,
} from "./visibleTextQuality";

const DOLLY_DUMP =
  "182 (freely) I WILL ALWAYS LOVE YOU - DOLLY PARTON N.C. if ____ would ____";

describe("visibleTextQuality false-positive preservation", () => {
  for (const phrase of [
    "Just One More Plant",
    "Class of 2026",
    "John 3:16",
    "Mama's Girl",
    "Smith & Co.",
    "Route 66",
    "USA 1776",
    "I make fish come",
  ]) {
    it(`keeps ${phrase}`, () => {
      assert.equal(looksLikeTranscriptionNoise(phrase), false);
      assert.equal(looksLikeMeaningfulPrimaryText(phrase), true);
      assert.deepEqual(sanitizeMeaningfulVisibleTextPhrases([phrase]), [phrase]);
    });
  }
});

describe("visibleTextQuality T1–T10", () => {
  it("T1 Dolly-style dump extracts song title and name only", () => {
    const result = sanitizeMeaningfulVisibleTextPhrases([DOLLY_DUMP]);
    assert.ok(result?.some((line) => /i will always love you/i.test(line)));
    assert.ok(result?.some((line) => /dolly parton/i.test(line)));
    assert.equal(result?.some((line) => /____/.test(line) || /n\.c/i.test(line) || /^182/.test(line)), false);
  });

  it("T2 newspaper article dump is suppressed", () => {
    const article =
      "City Council voted 7-2 late Tuesday to approve the downtown paving bid after three hours of public comment from residents who said the potholes have damaged cars for years.";
    const result = sanitizeMeaningfulVisibleTextPhrases(["Morning Gazette", article]);
    assert.deepEqual(result, ["Morning Gazette"]);
  });

  it("T3 book-page paragraph dump is suppressed", () => {
    const paragraph =
      "In the third chapter the heroine walked through the garden and remembered every summer she had spent there with her grandmother among the roses that climbed the stone wall.";
    const result = sanitizeMeaningfulVisibleTextPhrases(["Chapter III", paragraph]);
    assert.ok(result?.includes("Chapter III"));
    assert.equal(result?.some((line) => /heroine walked/i.test(line)), false);
  });

  it("T4 handwritten letter dump keeps a short phrase only", () => {
    const letter =
      "My dearest Anne, I write to you from the front where the weather has been cold and the nights are long and I hope this letter finds you well ____";
    const result = sanitizeMeaningfulVisibleTextPhrases(["Dearest Anne", letter]);
    assert.ok(result?.some((line) => /dearest anne/i.test(line)));
    assert.equal(result?.some((line) => /from the front/i.test(line)), false);
  });

  it("T5 slogan shirt is preserved", () => {
    assert.deepEqual(sanitizeMeaningfulVisibleTextPhrases(["Just One More Plant"]), ["Just One More Plant"]);
  });

  it("T6 Class of 2026 is preserved", () => {
    assert.deepEqual(sanitizeMeaningfulVisibleTextPhrases(["Class of 2026"]), ["Class of 2026"]);
  });

  it("T7 scripture is preserved", () => {
    assert.deepEqual(sanitizeMeaningfulVisibleTextPhrases(["John 3:16"]), ["John 3:16"]);
  });

  it("T8 dense notation without a headline yields empty visibleText", () => {
    const result = sanitizeMeaningfulVisibleTextPhrases(["N.C.", "G7", "____", "182"]);
    assert.equal(result, undefined);
  });

  it("T9 song title kept and lyrics suppressed", () => {
    const lyrics =
      "if ____ would ____ hold you close and never let you go through every verse and chorus line written on the staff";
    const result = sanitizeMeaningfulVisibleTextPhrases(["I Will Always Love You", lyrics]);
    assert.deepEqual(result, ["I Will Always Love You"]);
  });

  it("T10 text-heavy typography lines are not over-suppressed", () => {
    const result = sanitizeMeaningfulVisibleTextPhrases([
      "THAT SOUNDS LIKE",
      "MY",
      "HUSBAND'S PROBLEM",
    ]);
    assert.deepEqual(result, ["THAT SOUNDS LIKE", "MY", "HUSBAND'S PROBLEM"]);
  });
});

describe("visibleTextQuality dump title and description echo", () => {
  it("flags dump-shaped titles that contain a legitimate phrase", () => {
    assert.equal(
      looksLikeOcrDumpTitle("182 Freely I Will Always Love You Dolly Parton NC If Would"),
      true,
    );
    assert.equal(looksLikeOcrDumpTitle("Dolly Parton I Will Always Love You Sheet Music Portrait"), false);
    assert.equal(looksLikeOcrDumpTitle("Just One More Plant"), false);
    assert.equal(looksLikeOcrDumpTitle("Mama's Girl"), false);
  });

  it("strips OCR dump sentences from a mixed description", () => {
    const cleaned = stripOcrDumpFromDescription(
      'A vintage-style Dolly Parton portrait layered over sheet music for "I Will Always Love You," with warm country styling. 182 (freely) I WILL ALWAYS LOVE YOU - DOLLY PARTON N.C. if ____ would ____',
    );
    assert.match(cleaned, /dolly parton portrait/i);
    assert.match(cleaned, /sheet music/i);
    assert.doesNotMatch(cleaned, /____/);
    assert.doesNotMatch(cleaned, /n\.c/i);
  });

  it("drops redundant joined dump when parts already exist", () => {
    const result = sanitizeMeaningfulVisibleTextPhrases([
      "I Will Always Love You",
      "Dolly Parton",
      "I Will Always Love You Dolly Parton",
      DOLLY_DUMP,
    ]);
    assert.ok(result?.includes("I Will Always Love You"));
    assert.ok(result?.includes("Dolly Parton"));
    assert.equal(result?.some((line) => /____/.test(line)), false);
  });
});
