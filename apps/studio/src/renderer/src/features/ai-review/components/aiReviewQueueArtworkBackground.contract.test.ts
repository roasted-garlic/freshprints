import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("AiReviewQueueList passes artworkBackgroundHex into DesignThumbnailPanel", () => {
  const source = readFileSync(path.join(__dirname, "AiReviewQueueList.tsx"), "utf8");
  assert.match(source, /selectedArtworkBackgroundHex/);
  assert.match(source, /artworkBackgroundHex=\{/);
  assert.match(
    source,
    /isSelected\s*\?\s*selectedArtworkBackgroundHex\s*\?\?\s*design\.artworkBackgroundHex/,
  );
});

test("AiReviewPage wires resolved selected mat hex into the queue list", () => {
  const source = readFileSync(path.join(__dirname, "../pages/AiReviewPage.tsx"), "utf8");
  assert.match(source, /resolveFormArtworkBackgroundHex/);
  assert.match(source, /selectedArtworkBackgroundHex=\{selectedArtworkBackgroundHex\}/);
});
