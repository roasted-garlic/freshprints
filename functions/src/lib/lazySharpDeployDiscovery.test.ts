import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";

const loadCompiledModule = createRequire(__filename);

/**
 * `functions/src/index.ts` re-exports every callable/trigger, so Firebase's deploy discovery step
 * transitively requires every module in this repo — including the three that call `getSharp()`
 * (prepareAiAnalysisImage, customerUploadProcessing, portalOgImageCompose). Loading native `sharp`
 * during that cold discovery require is the exact regression this lazy loader exists to prevent, so
 * this proof runs against the compiled CommonJS output (`functions/lib/`), not the TypeScript source.
 */
describe("lazySharp deploy-discovery laziness", () => {
  function sharpCacheKeys(): string[] {
    return Object.keys(require.cache).filter(
      (key) => key.includes(`${path.sep}node_modules${path.sep}sharp${path.sep}`),
    );
  }

  it("does not load sharp when the compiled Functions index is required", () => {
    assert.equal(sharpCacheKeys().length, 0, "sharp must not be cached before this test runs");

    loadCompiledModule(path.resolve(__dirname, "../../lib/functions/src/index.js"));

    assert.equal(
      sharpCacheKeys().length,
      0,
      "requiring the compiled Functions index must not load native sharp",
    );
  });

  it("loads sharp only once getSharp() is invoked, then reuses the cached instance", () => {
    const { getSharp } = loadCompiledModule(
      path.resolve(__dirname, "../../lib/functions/src/lib/lazySharp.js"),
    ) as {
      getSharp: () => unknown;
    };

    const first = getSharp();
    assert.equal(typeof first, "function", "getSharp() must return the sharp factory function");
    assert.ok(sharpCacheKeys().length > 0, "sharp must be cached after getSharp() is invoked");

    const second = getSharp();
    assert.equal(second, first, "getSharp() must reuse the cached sharp module on subsequent calls");
  });
});
