/**
 * Compact derived taxonomy materialization (read-optimized).
 * Authoritative sources remain Firestore `tags/**` and `categories/**`.
 */

export const TAXONOMY_MATERIALIZATION_SCHEMA_VERSION = 1;

/** Soft max serialized UTF-8 bytes per chunk (RC8). */
export const TAXONOMY_MATERIALIZATION_CHUNK_SOFT_MAX_BYTES = 900 * 1024;

/** Firestore collection for meta + chunk docs. */
export const TAXONOMY_MATERIALIZATION_COLLECTION = "taxonomyMaterialization";

export const TAXONOMY_MATERIALIZATION_META_DOC_ID = "meta";

export function taxonomyMaterializationChunkDocId(chunkIndex: number): string {
  return `chunk-${chunkIndex}`;
}

/** When projected AI-shape bytes exceed this, revisit Option A / async rebuild (RC8). */
export const TAXONOMY_MATERIALIZATION_REVISIT_BYTES = 2_500_000;

export interface TaxonomyMaterializationCompactCategory {
  id: string;
  name: string;
  description?: string;
}

export interface TaxonomyMaterializationCompactTag {
  id: string;
  name: string;
  aliases: string[];
  preferredWhen: string;
  status: "approved";
}

export interface TaxonomyMaterializationMeta {
  revision: number;
  schemaVersion: number;
  chunkCount: number;
  tagCount: number;
  categoryCount: number;
  contentHash: string;
  updatedAtMs: number;
  updatedBy: string;
  /** Publication fence: readers require this to match after loading all chunks. */
  ready: true;
}

export interface TaxonomyMaterializationChunk {
  revision: number;
  schemaVersion: number;
  chunkIndex: number;
  chunkCount: number;
  contentHash: string;
  categories: TaxonomyMaterializationCompactCategory[];
  tags: TaxonomyMaterializationCompactTag[];
}

export interface TaxonomyMaterializationCorpus {
  categories: TaxonomyMaterializationCompactCategory[];
  tags: TaxonomyMaterializationCompactTag[];
}

export interface BuiltTaxonomyMaterialization {
  revision: number;
  schemaVersion: number;
  contentHash: string;
  tagCount: number;
  categoryCount: number;
  chunkCount: number;
  chunks: TaxonomyMaterializationChunk[];
  meta: TaxonomyMaterializationMeta;
  /** Approximate serialized size of full AI-shape corpus JSON. */
  corpusBytes: number;
}
