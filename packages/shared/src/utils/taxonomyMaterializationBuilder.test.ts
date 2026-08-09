import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildChunkDocuments,
  canonicalizeTaxonomyCorpus,
  estimateCorpusBytes,
  partitionTaxonomyCorpus,
  projectChunkCount,
  validateTaxonomyMaterializationStructure,
} from "./taxonomyMaterializationBuilder";
import { TAXONOMY_MATERIALIZATION_CHUNK_SOFT_MAX_BYTES } from "../types/taxonomy/taxonomyMaterialization.types";

describe("taxonomyMaterializationBuilder", () => {
  it("partitions deterministically and keeps categories in chunk 0", () => {
    const corpus = canonicalizeTaxonomyCorpus({
      categories: [
        { id: "b", name: "B" },
        { id: "a", name: "A" },
      ],
      tags: Array.from({ length: 5 }, (_, i) => ({
        id: `tag-${i}`,
        name: `Tag ${i}`,
        aliases: [],
        preferredWhen: "x",
        status: "approved" as const,
      })),
    });
    const partitions = partitionTaxonomyCorpus(corpus, 10_000_000);
    assert.equal(partitions.length, 1);
    const chunks = buildChunkDocuments({
      revision: 3,
      contentHash: "abc",
      corpus,
      softMaxBytes: 10_000_000,
    });
    assert.equal(chunks[0]?.categories.map((c) => c.id).join(","), "a,b");
    assert.equal(chunks[0]?.revision, 3);
  });

  it("creates multiple chunks when soft max is small", () => {
    const tags = Array.from({ length: 20 }, (_, i) => ({
      id: `tag-${String(i).padStart(2, "0")}`,
      name: `TagName${i}`,
      aliases: ["alias-one", "alias-two"],
      preferredWhen: "preferred when text for size",
      status: "approved" as const,
    }));
    const corpus = { categories: [{ id: "c1", name: "Cat" }], tags };
    const partitions = partitionTaxonomyCorpus(corpus, 800);
    assert.ok(partitions.length >= 2);
  });

  it("validates fence: chunk revision must match meta", () => {
    const corpus = {
      categories: [{ id: "c1", name: "Cat" }],
      tags: [
        {
          id: "t1",
          name: "Tag",
          aliases: [],
          preferredWhen: "p",
          status: "approved" as const,
        },
      ],
    };
    const chunks = buildChunkDocuments({
      revision: 2,
      contentHash: "hash",
      corpus,
    });
    const meta = {
      revision: 2,
      schemaVersion: 1,
      chunkCount: chunks.length,
      tagCount: 1,
      categoryCount: 1,
      contentHash: "hash",
      updatedAtMs: 1,
      updatedBy: "test",
      ready: true as const,
    };
    const ok = validateTaxonomyMaterializationStructure({ meta, chunks });
    assert.equal(ok.ok, true);

    const bad = validateTaxonomyMaterializationStructure({
      meta,
      chunks: chunks.map((c) => ({ ...c, revision: 1 })),
    });
    assert.equal(bad.ok, false);
  });

  it("projects chunk counts for scale (RC8)", () => {
    // Measured from plan-era AI JSON ~300 KiB / ~1121 tags ≈ 268 B/tag; cats ~2 KiB.
    const avgTagBytes = 268;
    const categoryBytes = 2000;
    const soft = TAXONOMY_MATERIALIZATION_CHUNK_SOFT_MAX_BYTES;
    assert.equal(projectChunkCount(1121, avgTagBytes, categoryBytes, soft), 1);
    const at5k = projectChunkCount(5000, avgTagBytes, categoryBytes, soft);
    const at10k = projectChunkCount(10000, avgTagBytes, categoryBytes, soft);
    // ~1.34 MiB @ 5K → still within soft max for ~2 chunks; 10K → more.
    assert.equal(at5k, 2);
    assert.equal(at10k, 3);
    assert.ok(soft >= 900 * 1024);
  });

  it("estimates corpus bytes", () => {
    const bytes = estimateCorpusBytes({
      categories: [{ id: "c", name: "C" }],
      tags: [
        {
          id: "t",
          name: "T",
          aliases: ["a"],
          preferredWhen: "p",
          status: "approved",
        },
      ],
    });
    assert.ok(bytes > 20);
  });
});
