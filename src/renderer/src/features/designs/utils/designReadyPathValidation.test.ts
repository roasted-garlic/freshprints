import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "../../../../../../shared/constants/design/designStoragePaths";
import { validateDesignReadyPaths } from "./designReadyPathValidation";

const designId = "abc123_test";

function createDesignFixture() {
  return {
    id: designId,
    originalPath: getOriginalStoragePath(designId),
  };
}

function createValidPaths() {
  return {
    originalPath: getOriginalStoragePath(designId),
    thumbnailPath: getThumbnailStoragePath(designId),
    previewPath: getPreviewStoragePath(designId),
  };
}

describe("validateDesignReadyPaths", () => {
  it("accepts canonical paths that match the design record", () => {
    const result = validateDesignReadyPaths(createDesignFixture(), createValidPaths());
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("rejects invalid thumbnailPath", () => {
    const result = validateDesignReadyPaths(createDesignFixture(), {
      ...createValidPaths(),
      thumbnailPath: "/thumbnails/wrong-id.webp",
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /thumbnailPath/);
  });

  it("rejects invalid previewPath", () => {
    const result = validateDesignReadyPaths(createDesignFixture(), {
      ...createValidPaths(),
      previewPath: "/previews/not-canonical.jpg",
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /previewPath/);
  });

  it("rejects missing originalPath on the design record", () => {
    const result = validateDesignReadyPaths(
      { id: designId, originalPath: "" },
      createValidPaths(),
    );

    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /originalPath/);
  });

  it("rejects paths.originalPath that does not match the design record", () => {
    const result = validateDesignReadyPaths(createDesignFixture(), {
      ...createValidPaths(),
      originalPath: getOriginalStoragePath("other-design"),
    });

    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /originalPath/);
  });
});
