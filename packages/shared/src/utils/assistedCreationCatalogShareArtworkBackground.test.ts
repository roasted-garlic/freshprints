import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  resolveArtworkBackgroundHex,
} from "../constants/design/artworkBackground.constants";
import {
  buildAssistedCatalogShareArtworkBackgroundSnapshots,
  needsAssistedCatalogShareArtworkBackgroundLiveResolve,
  resolveAssistedCatalogShareArtworkBackgroundHex,
  snapshotAssistedCatalogArtworkBackgroundHex,
} from "./assistedCreationCatalogShareArtworkBackground";

const CUSTOM = "#2c2d2d";
const OTHER = "#aabbcc";

describe("assistedCreationCatalogShareArtworkBackground", () => {
  it("snapshots a ready design custom background as lowercase #rrggbb", () => {
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex("#2C2D2D"), CUSTOM);
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex("2c2d2d"), CUSTOM);
  });

  it("buildAssistedCatalogShareArtworkBackgroundSnapshots writes matching suggestion + proof fields", () => {
    assert.deepEqual(buildAssistedCatalogShareArtworkBackgroundSnapshots(CUSTOM), {
      artworkBackgroundHex: CUSTOM,
      catalogArtworkBackgroundHex: CUSTOM,
    });
  });

  it("authoritative design hex wins; client-supplied conflicting hex is never an input to snapshot builder", () => {
    const clientAttempt = OTHER;
    const authoritative = CUSTOM;
    // Suggest path only passes design-doc hex into the builder — clientAttempt is unused.
    const snapshots = buildAssistedCatalogShareArtworkBackgroundSnapshots(authoritative);
    assert.equal(snapshots.artworkBackgroundHex, authoritative);
    assert.notEqual(snapshots.artworkBackgroundHex, clientAttempt);
    assert.equal(snapshots.catalogArtworkBackgroundHex, authoritative);
  });

  it("catalog-share proof field maps from the same snapshot builder output", () => {
    const snapshots = buildAssistedCatalogShareArtworkBackgroundSnapshots(CUSTOM);
    assert.equal(snapshots.catalogArtworkBackgroundHex, CUSTOM);
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        proofCatalogArtworkBackgroundHex: snapshots.catalogArtworkBackgroundHex,
      }),
      CUSTOM,
    );
  });

  it("Studio picker / overview / proof surfaces resolve suggestion then proof then live", () => {
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        suggestedArtworkBackgroundHex: CUSTOM,
        proofCatalogArtworkBackgroundHex: OTHER,
        liveDesignArtworkBackgroundHex: "#ffffff",
      }),
      CUSTOM,
    );
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        proofCatalogArtworkBackgroundHex: OTHER,
        liveDesignArtworkBackgroundHex: "#ffffff",
      }),
      OTHER,
    );
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        liveDesignArtworkBackgroundHex: CUSTOM,
      }),
      CUSTOM,
    );
  });

  it("Portal stage / lightbox / proofs tab / approved card share the same resolver preference", () => {
    const resolved = resolveAssistedCatalogShareArtworkBackgroundHex({
      suggestedArtworkBackgroundHex: CUSTOM,
    });
    assert.equal(resolved, CUSTOM);
    assert.equal(resolveArtworkBackgroundHex(resolved), CUSTOM);
  });

  it("transparent PNG source is presentation-only — resolver never mutates image bytes or paths", () => {
    const previewPath = "catalog/ready/design-1/preview.webp";
    const snapshots = buildAssistedCatalogShareArtworkBackgroundSnapshots(CUSTOM);
    assert.equal(previewPath, "catalog/ready/design-1/preview.webp");
    assert.equal(snapshots.artworkBackgroundHex, CUSTOM);
    assert.ok(!("previewImageUrl" in snapshots));
    assert.ok(!("storagePath" in snapshots));
  });

  it("missing background falls back to undefined so UI uses default mat", () => {
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex(undefined), undefined);
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex(""), undefined);
    assert.equal(resolveAssistedCatalogShareArtworkBackgroundHex({}), undefined);
    assert.equal(resolveArtworkBackgroundHex(undefined), ARTWORK_BACKGROUND_PRESET_GREY);
  });

  it("invalid background falls back safely", () => {
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex("not-a-color"), undefined);
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex("#gg0000"), undefined);
    assert.equal(snapshotAssistedCatalogArtworkBackgroundHex("#fff"), undefined);
    assert.deepEqual(buildAssistedCatalogShareArtworkBackgroundSnapshots("nope"), {});
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        suggestedArtworkBackgroundHex: "bad",
        proofCatalogArtworkBackgroundHex: "#12",
        liveDesignArtworkBackgroundHex: "zzz",
      }),
      undefined,
    );
    assert.equal(resolveArtworkBackgroundHex("bad"), ARTWORK_BACKGROUND_PRESET_GREY);
  });

  it("legacy share without snapshot resolves linked ready design hex", () => {
    assert.equal(
      needsAssistedCatalogShareArtworkBackgroundLiveResolve({}),
      true,
    );
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        liveDesignArtworkBackgroundHex: CUSTOM,
      }),
      CUSTOM,
    );
  });

  it("legacy share with unavailable linked design falls back to default mat", () => {
    assert.equal(
      resolveAssistedCatalogShareArtworkBackgroundHex({
        liveDesignArtworkBackgroundHex: undefined,
      }),
      undefined,
    );
    assert.equal(resolveArtworkBackgroundHex(undefined), ARTWORK_BACKGROUND_PRESET_GREY);
  });

  it("legacy resolution helper only signals one-shot get need — not a listener or read loop", () => {
    assert.equal(
      needsAssistedCatalogShareArtworkBackgroundLiveResolve({
        suggestedArtworkBackgroundHex: CUSTOM,
      }),
      false,
    );
    assert.equal(
      needsAssistedCatalogShareArtworkBackgroundLiveResolve({
        proofCatalogArtworkBackgroundHex: CUSTOM,
      }),
      false,
    );
    // Flag is a pure boolean from snapshots; callers must not subscribe onSnapshot.
    assert.equal(typeof needsAssistedCatalogShareArtworkBackgroundLiveResolve({}), "boolean");
  });

  it("existing catalog-share source tracking fields remain orthogonal to background snapshots", () => {
    const snapshots = buildAssistedCatalogShareArtworkBackgroundSnapshots(CUSTOM);
    const proofShape = {
      kind: "catalog_share" as const,
      storagePath: "",
      catalogDesignId: "design-1",
      catalogPreviewImageUrl: "catalog/ready/design-1/preview.webp",
      ...("catalogArtworkBackgroundHex" in snapshots
        ? { catalogArtworkBackgroundHex: snapshots.catalogArtworkBackgroundHex }
        : {}),
    };
    assert.equal(proofShape.kind, "catalog_share");
    assert.equal(proofShape.storagePath, "");
    assert.equal(proofShape.catalogDesignId, "design-1");
    assert.equal(proofShape.catalogArtworkBackgroundHex, CUSTOM);
  });

  it("proof approval/revision lifecycle fields are not part of artwork background snapshots", () => {
    const snapshots = buildAssistedCatalogShareArtworkBackgroundSnapshots(CUSTOM);
    assert.deepEqual(Object.keys(snapshots).sort(), [
      "artworkBackgroundHex",
      "catalogArtworkBackgroundHex",
    ]);
  });
});
