import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatAiPlaygroundOutput } from "./aiPlaygroundOutputFormatter";

describe("formatAiPlaygroundOutput", () => {
  it("pretty formats minified JSON objects", () => {
    assert.equal(
      formatAiPlaygroundOutput('{"title":"Motherhood Rocks","tags":["mom","skeleton"]}'),
      '{\n  "title": "Motherhood Rocks",\n  "tags": [\n    "mom",\n    "skeleton"\n  ]\n}',
    );
  });

  it("pretty formats JSON arrays", () => {
    assert.equal(
      formatAiPlaygroundOutput('[{"name":"mom"},{"name":"skeleton"}]'),
      '[\n  {\n    "name": "mom"\n  },\n  {\n    "name": "skeleton"\n  }\n]',
    );
  });

  it("pretty formats fully fenced JSON and removes the fence", () => {
    assert.equal(
      formatAiPlaygroundOutput('```json\n{"title":"Motherhood Rocks"}\n```'),
      '{\n  "title": "Motherhood Rocks"\n}',
    );
  });

  it("pretty formats fully fenced JSON without a language label", () => {
    assert.equal(
      formatAiPlaygroundOutput('```\n{"title":"Motherhood Rocks"}\n```'),
      '{\n  "title": "Motherhood Rocks"\n}',
    );
  });

  it("leaves invalid JSON unchanged", () => {
    const output = '{"title":"Motherhood Rocks",}';

    assert.equal(formatAiPlaygroundOutput(output), output);
  });

  it("leaves prose with embedded JSON unchanged", () => {
    const output = 'Here is the result: {"title":"Motherhood Rocks"}';

    assert.equal(formatAiPlaygroundOutput(output), output);
  });
});
