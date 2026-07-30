import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_ASSET_IPC_CHANNELS,
  isAllowedCatalogAssetIpcChannel,
} from "./catalogAssetIpcChannels";

describe("catalogAsset IPC channel allowlist", () => {
  it("allows the registered fetch-json channel", () => {
    assert.equal(isAllowedCatalogAssetIpcChannel(CATALOG_ASSET_IPC_CHANNELS.FETCH_JSON), true);
  });

  it("rejects an unregistered channel string", () => {
    assert.equal(isAllowedCatalogAssetIpcChannel("fresh-prints:catalog-asset:not-a-real-channel"), false);
  });

  it("rejects a channel name from an unrelated IPC feature", () => {
    assert.equal(isAllowedCatalogAssetIpcChannel("fresh-prints:app:open-dev-tools"), false);
  });
});
