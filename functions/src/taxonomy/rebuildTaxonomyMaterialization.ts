import { createHash } from "node:crypto";

import {
  TAXONOMY_MATERIALIZATION_COLLECTION,
  TAXONOMY_MATERIALIZATION_META_DOC_ID,
  TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
  taxonomyMaterializationChunkDocId,
  type BuiltTaxonomyMaterialization,
  type TaxonomyMaterializationCorpus,
  type TaxonomyMaterializationMeta,
} from "../../../packages/shared/src/types/taxonomy/taxonomyMaterialization.types";
import {
  buildChunkDocuments,
  canonicalizeTaxonomyCorpus,
  estimateCorpusBytes,
  taxonomyCorpusCanonicalJson,
  validateTaxonomyMaterializationStructure,
} from "../../../packages/shared/src/utils/taxonomyMaterializationBuilder";

import { adminDb } from "../lib/admin";
import { logPipelineEvent } from "../lib/pipelineLog";

export function hashTaxonomyCorpusSha256(corpus: TaxonomyMaterializationCorpus): string {
  return createHash("sha256")
    .update(taxonomyCorpusCanonicalJson(canonicalizeTaxonomyCorpus(corpus)), "utf8")
    .digest("hex");
}

export function buildTaxonomyMaterialization(input: {
  revision: number;
  corpus: TaxonomyMaterializationCorpus;
  updatedBy: string;
  updatedAtMs?: number;
}): BuiltTaxonomyMaterialization {
  const corpus = canonicalizeTaxonomyCorpus(input.corpus);
  const contentHash = hashTaxonomyCorpusSha256(corpus);
  const chunks = buildChunkDocuments({
    revision: input.revision,
    contentHash,
    corpus,
  });
  const updatedAtMs = input.updatedAtMs ?? Date.now();
  const meta: TaxonomyMaterializationMeta = {
    revision: input.revision,
    schemaVersion: TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
    chunkCount: chunks.length,
    tagCount: corpus.tags.length,
    categoryCount: corpus.categories.length,
    contentHash,
    updatedAtMs,
    updatedBy: input.updatedBy,
    ready: true,
  };
  return {
    revision: input.revision,
    schemaVersion: TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
    contentHash,
    tagCount: corpus.tags.length,
    categoryCount: corpus.categories.length,
    chunkCount: chunks.length,
    chunks,
    meta,
    corpusBytes: estimateCorpusBytes(corpus),
  };
}

export async function loadAuthoritativeTaxonomyCorpus(): Promise<TaxonomyMaterializationCorpus> {
  const [categoriesSnapshot, tagsSnapshot] = await Promise.all([
    adminDb.collection("categories").where("isActive", "==", true).get(),
    adminDb.collection("tags").where("status", "==", "approved").get(),
  ]);

  const categories: TaxonomyMaterializationCorpus["categories"] = [];
  categoriesSnapshot.forEach((document) => {
    const data = document.data();
    if (typeof data.name !== "string" || !data.name.trim()) return;
    categories.push({
      id: document.id,
      name: data.name.trim(),
      ...(typeof data.description === "string" && data.description.trim()
        ? { description: data.description.trim() }
        : {}),
    });
  });

  const tags: TaxonomyMaterializationCorpus["tags"] = [];
  tagsSnapshot.forEach((document) => {
    const data = document.data();
    if (
      typeof data.name !== "string" ||
      !Array.isArray(data.aliases) ||
      typeof data.preferredWhen !== "string"
    ) {
      return;
    }
    tags.push({
      id: document.id,
      name: data.name,
      aliases: data.aliases.filter((alias): alias is string => typeof alias === "string"),
      preferredWhen: data.preferredWhen,
      status: "approved",
    });
  });

  return canonicalizeTaxonomyCorpus({ categories, tags });
}

/**
 * Shared server-owned rebuild entrypoint (RC1).
 * Publication fence (RC5): write all chunk docs for `newRevision` first, then meta last.
 * Readers require meta.ready + every chunk.revision === meta.revision + contentHash match.
 */
export async function rebuildTaxonomyMaterialization(input?: {
  updatedBy?: string;
  reason?: string;
}): Promise<BuiltTaxonomyMaterialization> {
  const updatedBy = input?.updatedBy ?? "system";
  const reason = input?.reason ?? "rebuild";

  const metaRef = adminDb
    .collection(TAXONOMY_MATERIALIZATION_COLLECTION)
    .doc(TAXONOMY_MATERIALIZATION_META_DOC_ID);
  const priorSnap = await metaRef.get();
  const priorRevision =
    priorSnap.exists && typeof priorSnap.data()?.revision === "number"
      ? (priorSnap.data()!.revision as number)
      : 0;
  const newRevision = priorRevision + 1;

  const corpus = await loadAuthoritativeTaxonomyCorpus();
  const built = buildTaxonomyMaterialization({
    revision: newRevision,
    corpus,
    updatedBy,
  });

  // Chunks first (fence), then meta.
  const batchSize = 400;
  for (let i = 0; i < built.chunks.length; i += batchSize) {
    const batch = adminDb.batch();
    for (const chunk of built.chunks.slice(i, i + batchSize)) {
      const ref = adminDb
        .collection(TAXONOMY_MATERIALIZATION_COLLECTION)
        .doc(taxonomyMaterializationChunkDocId(chunk.chunkIndex));
      batch.set(ref, chunk);
    }
    await batch.commit();
  }

  await metaRef.set(built.meta);

  // Best-effort cleanup of orphan higher-index chunks from a prior larger publish.
  const priorChunkCount =
    priorSnap.exists && typeof priorSnap.data()?.chunkCount === "number"
      ? (priorSnap.data()!.chunkCount as number)
      : 0;
  if (priorChunkCount > built.chunkCount) {
    const cleanup = adminDb.batch();
    for (let i = built.chunkCount; i < priorChunkCount; i++) {
      cleanup.delete(
        adminDb
          .collection(TAXONOMY_MATERIALIZATION_COLLECTION)
          .doc(taxonomyMaterializationChunkDocId(i)),
      );
    }
    await cleanup.commit();
  }

  logPipelineEvent("taxonomy-materialization-rebuild-success", {
    reason,
    revision: built.revision,
    chunkCount: built.chunkCount,
    tagCount: built.tagCount,
    categoryCount: built.categoryCount,
    corpusBytes: built.corpusBytes,
    contentHash: built.contentHash,
    updatedBy,
  });

  return built;
}

export async function readTaxonomyMaterializationCorpus(): Promise<
  | { ok: true; revision: number; corpus: TaxonomyMaterializationCorpus; meta: TaxonomyMaterializationMeta }
  | { ok: false; reason: string }
> {
  const metaSnap = await adminDb
    .collection(TAXONOMY_MATERIALIZATION_COLLECTION)
    .doc(TAXONOMY_MATERIALIZATION_META_DOC_ID)
    .get();
  if (!metaSnap.exists) {
    return { ok: false, reason: "meta_missing" };
  }
  const meta = metaSnap.data() as TaxonomyMaterializationMeta;
  if (!meta?.ready || !meta.chunkCount) {
    return { ok: false, reason: "meta_not_ready" };
  }

  const chunkSnaps = await Promise.all(
    Array.from({ length: meta.chunkCount }, (_, i) =>
      adminDb
        .collection(TAXONOMY_MATERIALIZATION_COLLECTION)
        .doc(taxonomyMaterializationChunkDocId(i))
        .get(),
    ),
  );
  if (chunkSnaps.some((s) => !s.exists)) {
    return { ok: false, reason: "chunk_missing" };
  }
  const chunks = chunkSnaps.map((s) => s.data()!);
  const structural = validateTaxonomyMaterializationStructure({ meta, chunks: chunks as never });
  if (!structural.ok) {
    return structural;
  }
  const recomputed = hashTaxonomyCorpusSha256(structural.corpus);
  if (recomputed !== meta.contentHash) {
    return { ok: false, reason: "content_hash_mismatch" };
  }
  return { ok: true, revision: meta.revision, corpus: structural.corpus, meta };
}
