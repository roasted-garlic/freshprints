export const CATALOG_ASSET_FETCH_JSON = "fresh-prints:catalog-asset:fetch-json" as const;

export const CATALOG_ASSET_IPC_CHANNELS = {
  FETCH_JSON: CATALOG_ASSET_FETCH_JSON,
} as const;

export type CatalogAssetIpcChannel =
  (typeof CATALOG_ASSET_IPC_CHANNELS)[keyof typeof CATALOG_ASSET_IPC_CHANNELS];

const ALLOWED_CATALOG_ASSET_IPC_CHANNELS = new Set<string>(
  Object.values(CATALOG_ASSET_IPC_CHANNELS),
);

export function isAllowedCatalogAssetIpcChannel(
  channel: string,
): channel is CatalogAssetIpcChannel {
  return ALLOWED_CATALOG_ASSET_IPC_CHANNELS.has(channel);
}
