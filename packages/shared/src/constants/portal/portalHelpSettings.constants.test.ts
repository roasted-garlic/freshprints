import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePortalHelpSettingsInput,
  resolvePortalHelpSettings,
} from "./portalHelpSettings.constants";

describe("resolvePortalHelpSettings", () => {
  it("returns empty lists for missing doc", () => {
    const resolved = resolvePortalHelpSettings(undefined);
    assert.deepEqual(resolved.faqs, []);
    assert.deepEqual(resolved.videos, []);
  });

  it("sorts by order and drops invalid videos", () => {
    const resolved = resolvePortalHelpSettings({
      faqs: [
        { id: "b", question: "Q2", answer: "A2", order: 1 },
        { id: "a", question: "Q1", answer: "A1", order: 0 },
      ],
      videos: [
        {
          id: "v1",
          title: "Walkthrough",
          videoUrl: "https://youtu.be/dQw4w9WgXcQ",
          order: 0,
        },
        {
          id: "bad",
          title: "Evil",
          videoUrl: "https://evil.example/x",
          order: 1,
        },
      ],
    });
    assert.equal(resolved.faqs[0]?.id, "a");
    assert.equal(resolved.faqs[1]?.id, "b");
    assert.equal(resolved.videos.length, 1);
    assert.equal(resolved.videos[0]?.id, "v1");
  });
});

describe("parsePortalHelpSettingsInput", () => {
  it("accepts valid faqs and HTTPS YouTube/Vimeo videos", () => {
    const parsed = parsePortalHelpSettingsInput({
      faqs: [{ id: "f1", question: " How? ", answer: "Like this.", order: 2 }],
      videos: [
        {
          id: "v1",
          title: "Intro",
          description: "  Short  ",
          videoUrl: "https://vimeo.com/123456789",
          order: 5,
        },
      ],
    });
    assert.ok(parsed);
    assert.equal(parsed.faqs[0]?.question, "How?");
    assert.equal(parsed.faqs[0]?.order, 0);
    assert.equal(parsed.videos[0]?.videoUrl, "https://vimeo.com/123456789");
    assert.equal(parsed.videos[0]?.description, "Short");
    assert.equal(parsed.videos[0]?.order, 0);
  });

  it("rejects http video URLs and duplicate ids", () => {
    assert.equal(
      parsePortalHelpSettingsInput({
        faqs: [],
        videos: [
          {
            id: "v1",
            title: "Intro",
            videoUrl: "http://youtu.be/dQw4w9WgXcQ",
            order: 0,
          },
        ],
      }),
      null,
    );
    assert.equal(
      parsePortalHelpSettingsInput({
        faqs: [
          { id: "f1", question: "Q", answer: "A", order: 0 },
          { id: "f1", question: "Q2", answer: "A2", order: 1 },
        ],
        videos: [],
      }),
      null,
    );
  });

  it("allows empty lists", () => {
    assert.deepEqual(parsePortalHelpSettingsInput({ faqs: [], videos: [] }), {
      faqs: [],
      videos: [],
    });
  });
});
