import assert from "node:assert/strict";
import test from "node:test";

import { resolveStaticOgImageUrl } from "./portalStaticOgImage";

test("resolveStaticOgImageUrl returns https downloadUrl from snapshot", async () => {
  const url = await resolveStaticOgImageUrl({
    kind: "upload",
    storagePath: "portal-social-meta/static-og/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png",
    downloadUrl: "https://example.com/static-og.png",
    sourceDesignId: null,
  });
  assert.equal(url, "https://example.com/static-og.png");
});

test("resolveStaticOgImageUrl fail-safes to null for missing snapshot", async () => {
  assert.equal(await resolveStaticOgImageUrl(null), null);
  assert.equal(
    await resolveStaticOgImageUrl({
      kind: "design",
      storagePath: null,
      downloadUrl: null,
      sourceDesignId: "design_1",
    }),
    null,
  );
  assert.equal(
    await resolveStaticOgImageUrl({
      kind: "upload",
      storagePath: null,
      downloadUrl: "http://insecure.example/x.png",
      sourceDesignId: null,
    }),
    null,
  );
});
