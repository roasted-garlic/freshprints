/**
 * Resolver parity: materialized corpus ≡ Firestore-shaped corpus (RC9).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";

import { resolveAiCatalogTags } from "../ai/catalogTagResolver";
import { buildTaxonomyMaterialization, hashTaxonomyCorpusSha256 } from "./rebuildTaxonomyMaterialization";
import { taxonomyCorpusCanonicalJson, canonicalizeTaxonomyCorpus } from "../../../packages/shared/src/utils/taxonomyMaterializationBuilder";

describe("taxonomy materialization builder + hash", () => {
  it("hashes canonically", () => {
    const corpus = canonicalizeTaxonomyCorpus({
      categories: [{ id: "c", name: "C" }],
      tags: [
        {
          id: "t",
          name: "halftone",
          aliases: ["ht"],
          preferredWhen: "always",
          status: "approved",
        },
      ],
    });
    const a = hashTaxonomyCorpusSha256(corpus);
    const b = createHash("sha256").update(taxonomyCorpusCanonicalJson(corpus), "utf8").digest("hex");
    assert.equal(a, b);
  });

  it("builds single chunk for current-scale corpus", () => {
    const tags = Array.from({ length: 100 }, (_, i) => ({
      id: `id-${i}`,
      name: `name-${i}`,
      aliases: [`a-${i}`],
      preferredWhen: "p",
      status: "approved" as const,
    }));
    const built = buildTaxonomyMaterialization({
      revision: 1,
      updatedBy: "test",
      corpus: {
        categories: [{ id: "c1", name: "Cat", description: "d" }],
        tags,
      },
    });
    assert.equal(built.chunkCount, 1);
    assert.equal(built.tagCount, 100);
    assert.equal(built.meta.ready, true);
  });
});

describe("resolver parity materialized vs FS-shaped", () => {
  it("exact + alias match results are identical", () => {
    const tags = [
      {
        id: "1",
        name: "Funny",
        aliases: ["lol", "humor"],
        preferredWhen: "comedy",
        status: "approved" as const,
      },
      {
        id: "2",
        name: "halftone",
        aliases: [],
        preferredWhen: "required",
        status: "approved" as const,
      },
    ];
    const categories = [{ id: "c", name: "General" }];
    const built = buildTaxonomyMaterialization({
      revision: 1,
      updatedBy: "test",
      corpus: { categories, tags },
    });
    const fromChunks = built.chunks.flatMap((c) => c.tags);

    const fsShaped = tags.map((t) => ({
      ...t,
      createdAt: null,
      updatedAt: null,
      createdBy: "x",
      updatedBy: "x",
    }));
    const matShaped = fromChunks.map((t) => ({
      ...t,
      createdAt: null,
      updatedAt: null,
      createdBy: "x",
      updatedBy: "x",
    }));

    const left = resolveAiCatalogTags({
      candidates: ["lol", "Halftone"],
      approvedTags: fsShaped,
    });
    const right = resolveAiCatalogTags({
      candidates: ["lol", "Halftone"],
      approvedTags: matShaped,
    });
    assert.deepEqual([...left.tags].sort(), [...right.tags].sort());
    assert.ok(left.tags.includes("Funny"));
    assert.ok(left.tags.includes("halftone"));
  });
});
