import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Design } from "../types/design.types";
import {
  buildDesignOriginalDownloadFileName,
  canDownloadDesignOriginal,
} from "./designOriginalDownload";

describe("canDownloadDesignOriginal", () => {
  it("allows download when originalPath is present and assets are not purged", () => {
    assert.equal(
      canDownloadDesignOriginal({
        originalPath: "/originals/design-1.png",
        title: "Logo",
      }),
      true,
    );
  });

  it("blocks download when assets are purged or originalPath is missing", () => {
    assert.equal(
      canDownloadDesignOriginal({
        assetsPurgedAt: { toMillis: () => 1 } as Design["assetsPurgedAt"],
        originalPath: "/originals/design-1.png",
        title: "Logo",
      }),
      false,
    );
    assert.equal(
      canDownloadDesignOriginal({
        originalPath: "   ",
        title: "Logo",
      }),
      false,
    );
  });
});

describe("buildDesignOriginalDownloadFileName", () => {
  it("uses the Storage original basename when available", () => {
    assert.equal(
      buildDesignOriginalDownloadFileName({
        originalPath: "/originals/summer-logo.png",
        title: "Ignored Title",
      }),
      "summer-logo.png",
    );
  });

  it("falls back to sanitized title plus extension", () => {
    assert.equal(
      buildDesignOriginalDownloadFileName({
        originalPath: "/originals/",
        title: 'My "Cool" Design?',
      }),
      "My Cool Design.png",
    );
  });
});
