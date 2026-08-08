/**
 * Studio taxonomy materialization client — staff-read Firestore chunks + userData disk cache.
 *
 * Critical path (RC6):
 * 1. read materialization meta
 * 2. compare meta.revision with local userData cache revision
 * 3. if equal → use disk cache (no listTags / listCategories)
 * 4. if different → fetch chunks, validate, persist userData, use corpus
 *
 * When meta is missing (pre-bootstrap), returns unavailable so callers fall back to FS lists (RC4).
 */

import {
  TAXONOMY_MATERIALIZATION_COLLECTION,
  TAXONOMY_MATERIALIZATION_META_DOC_ID,
  TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
  taxonomyMaterializationChunkDocId,
  type TaxonomyMaterializationChunk,
  type TaxonomyMaterializationMeta,
} from "@fresh-prints/shared/types/taxonomy/taxonomyMaterialization.types";
import {
  assembleCorpusFromChunks,
  validateTaxonomyMaterializationStructure,
} from "@fresh-prints/shared/utils/taxonomyMaterializationBuilder";
import type { CatalogTag } from "@fresh-prints/shared/types/catalogTag.types";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../../../config/firebase";
import type { Category } from "../types/category.types";

export interface StudioTaxonomyDiskCache {
  revision: number;
  contentHash: string;
  schemaVersion: number;
  categories: Category[];
  tags: CatalogTag[];
  savedAtMs: number;
}

function hasTaxonomyCacheApi(): boolean {
  return typeof window !== "undefined" && Boolean(window.freshPrints?.taxonomyCache);
}

async function readDiskCache(): Promise<StudioTaxonomyDiskCache | null> {
  if (!hasTaxonomyCacheApi()) return null;
  const result = await window.freshPrints.taxonomyCache.readDiskCache();
  if (!result.success || !result.data.cache) return null;
  const cache = result.data.cache;
  if (
    typeof cache.revision !== "number" ||
    typeof cache.contentHash !== "string" ||
    !Array.isArray(cache.tags) ||
    !Array.isArray(cache.categories)
  ) {
    return null;
  }
  return {
    revision: cache.revision,
    contentHash: cache.contentHash,
    schemaVersion:
      typeof cache.schemaVersion === "number"
        ? cache.schemaVersion
        : TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
    categories: cache.categories as Category[],
    tags: cache.tags as CatalogTag[],
    savedAtMs: typeof cache.savedAtMs === "number" ? cache.savedAtMs : 0,
  };
}

async function writeDiskCache(cache: StudioTaxonomyDiskCache): Promise<void> {
  if (!hasTaxonomyCacheApi()) return;
  await window.freshPrints.taxonomyCache.writeDiskCache({
    revision: cache.revision,
    contentHash: cache.contentHash,
    schemaVersion: cache.schemaVersion,
    categories: cache.categories,
    tags: cache.tags,
    savedAtMs: cache.savedAtMs,
  });
}

export function clearStudioTaxonomyDiskCache(): void {
  if (!hasTaxonomyCacheApi()) return;
  void window.freshPrints.taxonomyCache.clearDiskCache();
}

function toStudioCategories(
  categories: TaxonomyMaterializationChunk["categories"],
): Category[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    isActive: true,
    sortOrder: 0,
    createdBy: "taxonomy-materialization",
    updatedBy: "taxonomy-materialization",
    createdAt: null as unknown as Category["createdAt"],
    updatedAt: null as unknown as Category["updatedAt"],
  }));
}

function toStudioTags(tags: TaxonomyMaterializationChunk["tags"]): CatalogTag[] {
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    aliases: t.aliases,
    preferredWhen: t.preferredWhen,
    status: "approved",
    createdBy: "taxonomy-materialization",
    updatedBy: "taxonomy-materialization",
    createdAt: null,
    updatedAt: null,
  }));
}

export async function loadStudioTaxonomyPreferringMaterialization(): Promise<{
  source: "disk-cache" | "materialization" | "unavailable";
  categories: Category[];
  tags: CatalogTag[];
  revision: number | null;
}> {
  const metaSnap = await getDoc(
    doc(db, TAXONOMY_MATERIALIZATION_COLLECTION, TAXONOMY_MATERIALIZATION_META_DOC_ID),
  );
  if (!metaSnap.exists()) {
    return { source: "unavailable", categories: [], tags: [], revision: null };
  }
  const meta = metaSnap.data() as TaxonomyMaterializationMeta;
  if (!meta?.ready || !meta.chunkCount) {
    return { source: "unavailable", categories: [], tags: [], revision: null };
  }

  const local = await readDiskCache();
  if (local && local.revision === meta.revision && local.contentHash === meta.contentHash) {
    return {
      source: "disk-cache",
      categories: local.categories,
      tags: local.tags,
      revision: meta.revision,
    };
  }

  if (local && (local.revision !== meta.revision || local.contentHash !== meta.contentHash)) {
    clearStudioTaxonomyDiskCache();
  }

  const chunkSnaps = await Promise.all(
    Array.from({ length: meta.chunkCount }, (_, i) =>
      getDoc(doc(db, TAXONOMY_MATERIALIZATION_COLLECTION, taxonomyMaterializationChunkDocId(i))),
    ),
  );
  if (chunkSnaps.some((s) => !s.exists())) {
    return { source: "unavailable", categories: [], tags: [], revision: null };
  }
  const chunks = chunkSnaps.map((s) => s.data() as TaxonomyMaterializationChunk);
  const validated = validateTaxonomyMaterializationStructure({ meta, chunks });
  if (!validated.ok) {
    clearStudioTaxonomyDiskCache();
    return { source: "unavailable", categories: [], tags: [], revision: null };
  }

  const corpus = assembleCorpusFromChunks(chunks);
  const categories = toStudioCategories(corpus.categories);
  const tags = toStudioTags(corpus.tags);
  await writeDiskCache({
    revision: meta.revision,
    contentHash: meta.contentHash,
    schemaVersion: TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
    categories,
    tags,
    savedAtMs: Date.now(),
  });

  return { source: "materialization", categories, tags, revision: meta.revision };
}
