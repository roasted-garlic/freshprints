import {
  TAXONOMY_MATERIALIZATION_CHUNK_SOFT_MAX_BYTES,
  TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
  type TaxonomyMaterializationChunk,
  type TaxonomyMaterializationCompactCategory,
  type TaxonomyMaterializationCompactTag,
  type TaxonomyMaterializationCorpus,
  type TaxonomyMaterializationMeta,
} from "../types/taxonomy/taxonomyMaterialization.types";

export function canonicalizeTaxonomyCorpus(
  corpus: TaxonomyMaterializationCorpus,
): TaxonomyMaterializationCorpus {
  return {
    categories: [...corpus.categories].sort((a, b) => a.id.localeCompare(b.id)),
    tags: [...corpus.tags].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function taxonomyCorpusCanonicalJson(corpus: TaxonomyMaterializationCorpus): string {
  return JSON.stringify(canonicalizeTaxonomyCorpus(corpus));
}

export function estimateCorpusBytes(corpus: TaxonomyMaterializationCorpus): number {
  return new TextEncoder().encode(taxonomyCorpusCanonicalJson(corpus)).length;
}

/**
 * Deterministic chunking: categories always in chunk 0; tags in id order until soft max.
 */
export function partitionTaxonomyCorpus(
  corpus: TaxonomyMaterializationCorpus,
  softMaxBytes: number = TAXONOMY_MATERIALIZATION_CHUNK_SOFT_MAX_BYTES,
): TaxonomyMaterializationCompactTag[][] {
  const { categories, tags } = canonicalizeTaxonomyCorpus(corpus);

  if (tags.length === 0) {
    return [[]];
  }

  const chunks: TaxonomyMaterializationCompactTag[][] = [];
  let current: TaxonomyMaterializationCompactTag[] = [];
  const encoder = new TextEncoder();

  const measure = (cats: TaxonomyMaterializationCompactCategory[], tagSlice: TaxonomyMaterializationCompactTag[]) =>
    encoder.encode(JSON.stringify({ categories: cats, tags: tagSlice })).length;

  for (const tag of tags) {
    const trial = [...current, tag];
    const catsForMeasure = chunks.length === 0 ? categories : [];
    const bytes = measure(catsForMeasure, trial);
    if (current.length > 0 && bytes > softMaxBytes) {
      chunks.push(current);
      current = [tag];
    } else {
      current = trial;
    }
  }
  chunks.push(current);
  return chunks;
}

export function assembleCorpusFromChunks(
  chunks: TaxonomyMaterializationChunk[],
): TaxonomyMaterializationCorpus {
  const byIndex = new Map(chunks.map((c) => [c.chunkIndex, c]));
  const ordered = [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  const categories = ordered[0]?.categories ?? [];
  const tags = ordered.flatMap((c) => c.tags);
  return { categories, tags };
}

/**
 * Structural fence validation (RC5). Caller may additionally verify contentHash
 * via platform-specific SHA-256 (Node crypto / Web Crypto).
 */
export function validateTaxonomyMaterializationStructure(input: {
  meta: TaxonomyMaterializationMeta;
  chunks: TaxonomyMaterializationChunk[];
}): { ok: true; corpus: TaxonomyMaterializationCorpus } | { ok: false; reason: string } {
  const { meta, chunks } = input;
  if (!meta?.ready) {
    return { ok: false, reason: "meta_not_ready" };
  }
  if (meta.schemaVersion !== TAXONOMY_MATERIALIZATION_SCHEMA_VERSION) {
    return { ok: false, reason: "schema_version_mismatch" };
  }
  if (!Number.isInteger(meta.chunkCount) || meta.chunkCount < 1) {
    return { ok: false, reason: "invalid_chunk_count" };
  }
  if (chunks.length !== meta.chunkCount) {
    return { ok: false, reason: "chunk_count_mismatch" };
  }

  const byIndex = new Map<number, TaxonomyMaterializationChunk>();
  for (const chunk of chunks) {
    if (chunk.revision !== meta.revision) {
      return { ok: false, reason: "chunk_revision_mismatch" };
    }
    if (chunk.contentHash !== meta.contentHash) {
      return { ok: false, reason: "chunk_hash_mismatch" };
    }
    if (chunk.chunkCount !== meta.chunkCount) {
      return { ok: false, reason: "chunk_meta_count_mismatch" };
    }
    if (byIndex.has(chunk.chunkIndex)) {
      return { ok: false, reason: "duplicate_chunk_index" };
    }
    byIndex.set(chunk.chunkIndex, chunk);
  }

  for (let i = 0; i < meta.chunkCount; i++) {
    if (!byIndex.has(i)) {
      return { ok: false, reason: `missing_chunk_${i}` };
    }
  }

  const corpus = assembleCorpusFromChunks(chunks);
  if (corpus.tags.length !== meta.tagCount || corpus.categories.length !== meta.categoryCount) {
    return { ok: false, reason: "count_mismatch" };
  }

  return { ok: true, corpus };
}

export function projectChunkCount(
  tagCount: number,
  avgTagBytes: number,
  categoryBytes: number,
  softMaxBytes = TAXONOMY_MATERIALIZATION_CHUNK_SOFT_MAX_BYTES,
): number {
  const firstChunkBudget = Math.max(1, softMaxBytes - categoryBytes);
  if (tagCount <= 0) return 1;
  const tagsInFirst = Math.max(1, Math.floor(firstChunkBudget / Math.max(avgTagBytes, 1)));
  if (tagCount <= tagsInFirst) return 1;
  const remaining = tagCount - tagsInFirst;
  const perLater = Math.max(1, Math.floor(softMaxBytes / Math.max(avgTagBytes, 1)));
  return 1 + Math.ceil(remaining / perLater);
}

export function buildChunkDocuments(input: {
  revision: number;
  contentHash: string;
  corpus: TaxonomyMaterializationCorpus;
  softMaxBytes?: number;
}): TaxonomyMaterializationChunk[] {
  const corpus = canonicalizeTaxonomyCorpus(input.corpus);
  const tagPartitions = partitionTaxonomyCorpus(corpus, input.softMaxBytes);
  const chunkCount = tagPartitions.length;
  return tagPartitions.map((tagSlice, chunkIndex) => ({
    revision: input.revision,
    schemaVersion: TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
    chunkIndex,
    chunkCount,
    contentHash: input.contentHash,
    categories: chunkIndex === 0 ? corpus.categories : [],
    tags: tagSlice,
  }));
}
