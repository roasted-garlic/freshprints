import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  ClientCatalogReferenceSnapshot,
  PortalCatalogCard,
} from "@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types";
import type { Design } from "../types/design.types";

import {
  buildGeneratedDesignReconciliation,
  cardToDesign,
  clientCategoryToCategory,
  clientTagToCatalogTag,
  entryToFilterableDesign,
  type ReadyIndexEntry,
} from "./generatedReadyDesignMapping";
import {
  buildCategoryFilterOptions,
  computeFacetedTagsForDraftSelection,
  filterDesignsByCategory,
  filterDesignsBySearch,
  filterDesignsByTags,
} from "./designLibrarySearch";
import { buildCatalogTagSuggestions } from "./catalogTagSuggestions";
import { resolveCatalogTagCandidate } from "./catalogTagNormalizer";

function card(overrides: Partial<PortalCatalogCard> = {}): PortalCatalogCard {
  return {
    id: "design-1",
    title: "Design",
    tags: [],
    thumbnailPath: "design-1.webp",
    width: 3000,
    height: 3000,
    requestCount: 0,
    favoriteCount: 0,
    ...overrides,
  };
}

function entry(overrides: Partial<ReadyIndexEntry> = {}): ReadyIndexEntry {
  return {
    id: "design-1",
    title: "Design",
    tags: [],
    createdAtMs: 1000,
    ...overrides,
  };
}

function authoritativeDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Updated design",
    description: "Updated description",
    categoryId: "cat-1",
    tags: ["christmas"],
    status: "ready",
    originalPath: "originals/design-1.png",
    thumbnailPath: "thumbnails/design-1.webp",
    previewPath: "previews/design-1.webp",
    artworkBackgroundHex: "#112233",
    width: 3000,
    height: 2000,
    printWidthInches: 12,
    printHeightInches: 8,
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: true,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1000 } as Design["createdAt"],
    updatedAt: { toMillis: () => 2000 } as Design["updatedAt"],
    ...overrides,
  };
}

describe("generated edit reconciliation", () => {
  it("updates card-visible fields immediately while preserving createdAtMs", () => {
    const original = entry({ createdAtMs: 1234 });
    const result = buildGeneratedDesignReconciliation(
      original,
      authoritativeDesign({ artworkBackgroundHex: "#abcdef" }),
    );

    assert.equal(result.entry?.createdAtMs, 1234);
    assert.equal(result.card.artworkBackgroundHex, "#abcdef");
    assert.equal(result.card.thumbnailPath, "thumbnails/design-1.webp");
    assert.equal(result.card.previewPath, "previews/design-1.webp");
    assert.equal(result.preservedSortValue, true);
  });

  it("does not insert the raw Firestore Design into the generated index", () => {
    const persisted = authoritativeDesign();
    const result = buildGeneratedDesignReconciliation(entry(), persisted);

    assert.notEqual(result.entry, persisted);
    assert.equal("updatedAt" in (result.entry ?? {}), false);
    assert.equal("createdAt" in (result.entry ?? {}), false);
  });

  it("keeps visual-only edits in the same search/category/tag/halftone membership", () => {
    const original = entry({
      title: "Christmas Halftone",
      categoryId: "cat-1",
      tags: ["christmas", "halftone"],
    });
    const result = buildGeneratedDesignReconciliation(
      original,
      authoritativeDesign({
        title: original.title,
        categoryId: original.categoryId,
        tags: original.tags,
        artworkBackgroundHex: "#abcdef",
      }),
    );
    const filterable = entryToFilterableDesign(result.entry!);

    assert.equal(filterDesignsBySearch([filterable], "christmas").length, 1);
    assert.equal(filterDesignsByCategory([filterable], "cat-1").length, 1);
    assert.equal(filterDesignsByTags([filterable], ["christmas", "halftone"]).length, 1);
  });

  it("changes membership only when an edited list field changes", () => {
    const result = buildGeneratedDesignReconciliation(
      entry({ categoryId: "cat-1", tags: ["christmas"] }),
      authoritativeDesign({ categoryId: "cat-2", tags: ["summer"] }),
    );
    const filterable = entryToFilterableDesign(result.entry!);

    assert.equal(filterDesignsByCategory([filterable], "cat-1").length, 0);
    assert.equal(filterDesignsByTags([filterable], ["christmas"]).length, 0);
  });

  it("removes a design only when its authoritative status leaves ready", () => {
    const result = buildGeneratedDesignReconciliation(
      entry(),
      authoritativeDesign({ status: "archived" }),
    );

    assert.equal(result.entry, null);
  });
});

describe("cardToDesign (generated card -> renderable Design)", () => {
  it("carries every field DesignCard/DesignGrid actually render", () => {
    const design = cardToDesign(
      card({ id: "a", title: "Halloween Cat", artworkBackgroundHex: "#112233", thumbnailPath: "a.webp" }),
    );
    assert.equal(design.id, "a");
    assert.equal(design.title, "Halloween Cat");
    assert.equal(design.artworkBackgroundHex, "#112233");
    assert.equal(design.thumbnailPath, "a.webp");
    assert.equal(design.assetsPurgedAt, undefined);
  });

  it("marks status as ready (generated cards are always the ready-only scope)", () => {
    assert.equal(cardToDesign(card()).status, "ready");
  });

  it("does not populate authoritative-only fields (never treated as edit authority)", () => {
    const design = cardToDesign(card());
    assert.equal(design.originalPath, "");
    assert.equal(design.uploadedBy, "");
    assert.equal(design.aiProcessed, false);
  });

  it("carries categoryId/description/tags through for downstream filtering after resolution", () => {
    const design = cardToDesign(
      card({ categoryId: "cat-1", description: "A description", tags: ["christmas"] }),
    );
    assert.equal(design.categoryId, "cat-1");
    assert.equal(design.description, "A description");
    assert.deepEqual(design.tags, ["christmas"]);
  });
});

describe("entryToFilterableDesign (ready-index entry -> filtering-only Design stand-in)", () => {
  it("preserves id/title/description/categoryId/tags for filtering", () => {
    const design = entryToFilterableDesign(
      entry({
        id: "b",
        title: "Best Christmas Ever",
        description: "A festive design",
        categoryId: "cat-1",
        tags: ["christmas"],
      }),
    );
    assert.equal(design.id, "b");
    assert.equal(design.title, "Best Christmas Ever");
    assert.equal(design.description, "A festive design");
    assert.equal(design.categoryId, "cat-1");
    assert.deepEqual(design.tags, ["christmas"]);
  });

  it("produces objects that Studio's existing filter functions accept unchanged", () => {
    const entries = [
      entry({ id: "a", title: "Best Christmas Ever Castle", tags: ["christmas"], categoryId: "cat-1" }),
      entry({ id: "b", title: "We Are More Than Bestie", tags: ["friendship"], categoryId: "cat-2" }),
      entry({ id: "c", title: "Unrelated Design", tags: ["christmas", "disney"], categoryId: "cat-1" }),
    ];
    const designs = entries.map(entryToFilterableDesign);

    // Reproduces the exact owner-reported "BEST" Portal regression, this time for Studio's own
    // search implementation, proving both designs surface without needing card resolution first.
    const bestMatches = filterDesignsBySearch(designs, "best");
    assert.deepEqual(bestMatches.map((design) => design.id).sort(), ["a", "b"]);

    const categoryMatches = filterDesignsByCategory(designs, "cat-1");
    assert.deepEqual(categoryMatches.map((design) => design.id).sort(), ["a", "c"]);

    const tagMatches = filterDesignsByTags(designs, ["christmas", "disney"]);
    assert.deepEqual(tagMatches.map((design) => design.id), ["c"]);
  });

  it("does not carry thumbnail/dimension fields (filtering-only, never rendered directly)", () => {
    const design = entryToFilterableDesign(entry());
    assert.equal(design.thumbnailPath, "");
    assert.equal(design.width, undefined);
  });
});

function clientCategory(
  overrides: Partial<ClientCatalogReferenceSnapshot["categories"][number]> = {},
): ClientCatalogReferenceSnapshot["categories"][number] {
  return {
    id: "cat-1",
    name: "Halloween",
    sortOrder: 1,
    isActive: true,
    isCustomerVisible: true,
    ...overrides,
  };
}

function clientTag(
  overrides: Partial<ClientCatalogReferenceSnapshot["tags"][number]> = {},
): ClientCatalogReferenceSnapshot["tags"][number] {
  return {
    id: "tag-1",
    name: "skeleton",
    aliases: [],
    status: "approved",
    isCustomerVisible: true,
    ...overrides,
  };
}

describe("clientCategoryToCategory (generated taxonomy -> Studio Category)", () => {
  it("preserves id/name/sortOrder/isActive", () => {
    const category = clientCategoryToCategory(clientCategory({ id: "cat-2", name: "Christmas", sortOrder: 3 }));
    assert.equal(category.id, "cat-2");
    assert.equal(category.name, "Christmas");
    assert.equal(category.sortOrder, 3);
    assert.equal(category.isActive, true);
  });

  it("produces objects buildCategoryFilterOptions accepts unchanged", () => {
    const categories = [clientCategory({ id: "cat-1", name: "Halloween" })].map(clientCategoryToCategory);
    const designs = [entryToFilterableDesign(entry({ id: "d1", categoryId: "cat-1" }))];
    const options = buildCategoryFilterOptions({
      allOptionValue: "all",
      categories,
      designs,
    });
    assert.deepEqual(
      options.map((option) => option.label),
      ["All categories", "Halloween"],
    );
  });
});

describe("clientTagToCatalogTag (generated taxonomy -> Studio CatalogTag)", () => {
  it("preserves name/aliases/status; preferredWhen is an empty string", () => {
    const tag = clientTagToCatalogTag(
      clientTag({ name: "skeleton", aliases: ["skull"], status: "approved" }),
    );
    assert.equal(tag.name, "skeleton");
    assert.deepEqual(tag.aliases, ["skull"]);
    assert.equal(tag.status, "approved");
    assert.equal(tag.preferredWhen, "");
  });

  it("produces objects buildCatalogTagSuggestions matches by name and alias", () => {
    const tags = [clientTag({ name: "skeleton", aliases: ["skull", "bones"] })].map(clientTagToCatalogTag);
    const byName = buildCatalogTagSuggestions("skel", tags);
    assert.deepEqual(byName.map((s) => s.name), ["skeleton"]);

    const byAlias = buildCatalogTagSuggestions("bone", tags);
    assert.deepEqual(byAlias.map((s) => s.name), ["skeleton"]);
    assert.equal(byAlias[0]?.matchedAlias, "bones");
  });

  it("produces objects resolveCatalogTagCandidate resolves by name or alias", () => {
    const tags = [clientTag({ name: "skeleton", aliases: ["skull"] })].map(clientTagToCatalogTag);
    assert.equal(resolveCatalogTagCandidate("skeleton", tags), "skeleton");
    assert.equal(resolveCatalogTagCandidate("skull", tags), "skeleton");
    assert.equal(resolveCatalogTagCandidate("unrelated", tags), null);
  });

  it("produces objects computeFacetedTagsForDraftSelection uses for catalog-safe alias lookup during tag search", () => {
    const designs = [
      entryToFilterableDesign(entry({ id: "d1", tags: ["skeleton"] })),
      entryToFilterableDesign(entry({ id: "d2", tags: ["pumpkin"] })),
    ];
    const catalogTags = [clientTag({ name: "skeleton", aliases: ["skull"] })].map(clientTagToCatalogTag);

    const faceted = computeFacetedTagsForDraftSelection({
      baseDesigns: designs,
      catalogTags,
      draftSelectedTags: [],
      tagSearchQuery: "skull",
    });

    assert.deepEqual(faceted.map((f) => f.tag), ["skeleton"]);
  });

  it("the generated snapshot's tag status is always 'approved' (archived tags are never published)", () => {
    // ClientCatalogReferenceSnapshot.tags[].status is typed as the literal "approved" — the
    // snapshot builder only ever includes approved tags (see buildTaxonomySnapshots), so archived
    // tags cannot reach this mapping at all, unlike Firestore-backed useCatalogTags which can.
    const tag = clientTagToCatalogTag(clientTag({ status: "approved" }));
    assert.equal(tag.status, "approved");
  });
});
