import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BRAND_LOGO_MAX_BYTES,
  brandLogoBoxFromHeight,
  brandLogoBoxFromWidth,
  buildBrandLogoStoragePath,
  parseBrandLogoDisplaySizesInput,
  parseBrandLogoFinalizeInput,
  parseBrandLogoStoragePathForSlot,
  resolveBrandLogoDownloadUrl,
  resolveBrandLogoSettings,
  BRAND_LOGO_FULL_ASPECT_RATIO,
} from "./brandLogoSettings.constants";

describe("brandLogoSettings.constants", () => {
  const objectId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  it("builds and parses storage paths for each app/slot", () => {
    const path = buildBrandLogoStoragePath("portal", "full", objectId);
    assert.equal(path, `brand/portal/full/${objectId}.png`);
    assert.equal(parseBrandLogoStoragePathForSlot(`/${path}`, "portal", "full"), path);
    assert.equal(parseBrandLogoStoragePathForSlot(path, "studio", "full"), null);
    assert.equal(parseBrandLogoStoragePathForSlot(path, "portal", "collapsed"), null);
  });

  it("parses finalize input without trusting client file metadata", () => {
    const ok = parseBrandLogoFinalizeInput({
      app: "studio",
      slot: "collapsed",
      storagePath: `brand/studio/collapsed/${objectId}.png`,
      contentType: "image/gif",
      byteSize: 1,
      downloadUrl: "https://evil.example/x.png",
      aspectRatio: 1.25,
    });
    assert.deepEqual(ok, {
      app: "studio",
      slot: "collapsed",
      storagePath: `brand/studio/collapsed/${objectId}.png`,
      aspectRatio: 1.25,
      clear: false,
    });

    const clear = parseBrandLogoFinalizeInput({ app: "portal", slot: "full", clear: true });
    assert.deepEqual(clear, { app: "portal", slot: "full", clear: true });

    assert.equal(parseBrandLogoFinalizeInput({ app: "portal", slot: "full" }), null);
    assert.equal(
      parseBrandLogoFinalizeInput({
        app: "portal",
        slot: "full",
        storagePath: `brand/portal/full/${objectId}.png`,
        aspectRatio: 99,
      }),
      null,
    );
  });

  it("resolves download URLs with static fallbacks", () => {
    const settings = resolveBrandLogoSettings({
      portalFull: {
        storagePath: `brand/portal/full/${objectId}.png`,
        downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media&token=t",
        contentType: "image/png",
        byteSize: 1200,
      },
    });
    assert.equal(
      resolveBrandLogoDownloadUrl(settings, "portal", "full", "/brand/fallback.png"),
      "https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media&token=t",
    );
    assert.equal(
      resolveBrandLogoDownloadUrl(settings, "portal", "collapsed", "/brand/fallback-collapsed.png"),
      "/brand/fallback-collapsed.png",
    );
    assert.equal(BRAND_LOGO_MAX_BYTES, 2 * 1024 * 1024);
  });

  it("keeps width/height linked via aspect ratio helpers", () => {
    const fromHeight = brandLogoBoxFromHeight(52, BRAND_LOGO_FULL_ASPECT_RATIO);
    assert.equal(fromHeight.heightPx, 52);
    assert.equal(fromHeight.widthPx, Math.round(52 * BRAND_LOGO_FULL_ASPECT_RATIO));

    const fromWidth = brandLogoBoxFromWidth(fromHeight.widthPx, BRAND_LOGO_FULL_ASPECT_RATIO);
    assert.equal(fromWidth.widthPx, fromHeight.widthPx);
    assert.equal(fromWidth.heightPx, Math.round(fromHeight.widthPx / BRAND_LOGO_FULL_ASPECT_RATIO));

    const empty = resolveBrandLogoSettings(null);
    assert.equal(empty.portalHeader.heightPx, 52);
    assert.equal(empty.portalHeader.widthPx, fromHeight.widthPx);
    // Matching defaults only — header and expanded sidebar are separate controls.
    assert.equal(empty.portalSidebar.heightPx, 52);
    assert.equal(empty.portalSidebar.widthPx, empty.portalHeader.widthPx);
    assert.deepEqual(empty.portalSidebar, empty.portalHeader);

    const parsed = parseBrandLogoDisplaySizesInput({
      portalHeader: { widthPx: 130, heightPx: 52 },
      portalSidebar: { widthPx: 130, heightPx: 52 },
      portalSidebarCollapsed: { widthPx: 36, heightPx: 36 },
      portalAuth: { widthPx: 160, heightPx: 64 },
      studioSidebar: { widthPx: 130, heightPx: 52 },
      studioSidebarCollapsed: { widthPx: 36, heightPx: 36 },
      studioLogin: { widthPx: 180, heightPx: 72 },
    });
    assert.equal(parsed?.portalHeader.widthPx, 130);
    assert.equal(parseBrandLogoDisplaySizesInput({ portalHeader: { widthPx: 130, heightPx: 52 } }), null);

    const legacy = resolveBrandLogoSettings({ portalHeaderPx: 40 });
    assert.equal(legacy.portalHeader.heightPx, 40);
    assert.equal(legacy.portalHeader.widthPx, Math.round(40 * BRAND_LOGO_FULL_ASPECT_RATIO));
  });
});

describe("brandLogoSettingsCache", () => {
  it("round-trips slot URLs through serialize + resolve", async () => {
    const objectId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    const { serializeBrandLogoSettingsForCache } = await import("./brandLogoSettingsCache");
    const settings = resolveBrandLogoSettings({
      portalFull: {
        storagePath: `brand/portal/full/${objectId}.png`,
        downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media&token=t",
        contentType: "image/png",
        byteSize: 1200,
        aspectRatio: 2.5,
      },
      portalHeader: { widthPx: 130, heightPx: 52 },
    });
    const again = resolveBrandLogoSettings(serializeBrandLogoSettingsForCache(settings));
    assert.equal(again.portalFull?.downloadUrl, settings.portalFull?.downloadUrl);
    assert.equal(again.portalHeader.heightPx, 52);
  });
});
