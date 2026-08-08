export const TAXONOMY_CACHE_READ = "fresh-prints:taxonomy-cache:read" as const;
export const TAXONOMY_CACHE_WRITE = "fresh-prints:taxonomy-cache:write" as const;
export const TAXONOMY_CACHE_CLEAR = "fresh-prints:taxonomy-cache:clear" as const;

export const TAXONOMY_CACHE_IPC_CHANNELS = {
  READ: TAXONOMY_CACHE_READ,
  WRITE: TAXONOMY_CACHE_WRITE,
  CLEAR: TAXONOMY_CACHE_CLEAR,
} as const;

export type TaxonomyCacheIpcChannel =
  (typeof TAXONOMY_CACHE_IPC_CHANNELS)[keyof typeof TAXONOMY_CACHE_IPC_CHANNELS];

const ALLOWED = new Set<string>(Object.values(TAXONOMY_CACHE_IPC_CHANNELS));

export function isAllowedTaxonomyCacheIpcChannel(
  channel: string,
): channel is TaxonomyCacheIpcChannel {
  return ALLOWED.has(channel);
}
