import type {
  ClientCatalogReferenceSnapshot,
  PortalCatalogCard,
} from "@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types";

import type { CatalogTag } from "../types/catalogTag.types";
import type { Category } from "../types/category.types";
import type { Design } from "../types/design.types";

export interface ReadyIndexEntry {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  /** Original design-creation timestamp — immutable after creation. The generated asset already
   * uses `createdAt DESC, id DESC`; Studio also re-applies that order after local filtering. */
  createdAtMs: number;
}

/**
 * Synthesizes a minimal `Design` from a generated Portal card for rendering in the Design Library
 * grid (only `id`/`title`/`artworkBackgroundHex`/`thumbnailPath`/`assetsPurgedAt` are ever read by
 * `DesignCard`/`DesignGrid` — see the Wave C Plan amendment's field comparison). Fields the
 * generated card does not carry (`uploadedBy`, `aiSuggestions`, `createdAt`, etc., shown only in
 * `DesignDetailsModal`) are never populated here — opening a design always re-fetches the
 * authoritative Firestore document first (`designService.getDesignById`), so this synthetic object
 * is never treated as edit/detail authority.
 */
export function cardToDesign(card: PortalCatalogCard): Design {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    categoryId: card.categoryId,
    tags: card.tags,
    status: "ready",
    originalPath: "",
    thumbnailPath: card.thumbnailPath,
    previewPath: card.previewPath,
    artworkBackgroundHex: card.artworkBackgroundHex,
    width: card.width,
    height: card.height,
    printWidthInches: card.printWidthInches,
    printHeightInches: card.printHeightInches,
    uploadedBy: "",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "",
    updatedBy: "",
    createdAt: undefined as unknown as Design["createdAt"],
    updatedAt: undefined as unknown as Design["updatedAt"],
  };
}

/**
 * Synthesizes a filtering-only `Design` from a ready-index entry — has everything Studio's
 * existing `filterDesignsBySearch`/`filterDesignsByCategory`/`filterDesignsByTags`/
 * `computeFacetedTagsForDraftSelection` read (`id`/`title`/`description`/`categoryId`/`tags`), but
 * deliberately no thumbnail/dimensions (not needed until a design survives filtering and lands on
 * the visible page, at which point `cardToDesign` resolves the real card). Never rendered
 * directly — the page must resolve real cards for anything actually shown in the grid.
 */
export function entryToFilterableDesign(entry: ReadyIndexEntry): Design {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    categoryId: entry.categoryId,
    tags: entry.tags,
    status: "ready",
    originalPath: "",
    thumbnailPath: "",
    uploadedBy: "",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    createdBy: "",
    updatedBy: "",
    createdAt: undefined as unknown as Design["createdAt"],
    updatedAt: undefined as unknown as Design["updatedAt"],
  };
}

/** Fields from an authoritative Firestore design that may change list/filter membership. */
export function authoritativeDesignToReadyIndexPatch(
  design: Design,
): Omit<ReadyIndexEntry, "createdAtMs"> {
  return {
    id: design.id,
    title: design.title,
    description: design.description,
    categoryId: design.categoryId,
    tags: design.tags,
  };
}

export function authoritativeDesignToPortalCatalogCard(
  design: Design,
): PortalCatalogCard {
  return {
    id: design.id,
    title: design.title,
    description: design.description,
    categoryId: design.categoryId,
    tags: [...design.tags],
    thumbnailPath: design.thumbnailPath,
    previewPath: design.previewPath,
    artworkBackgroundHex: design.artworkBackgroundHex,
    width: design.width ?? 0,
    height: design.height ?? 0,
    printWidthInches: design.printWidthInches,
    printHeightInches: design.printHeightInches,
    createdAtMs: design.createdAt?.toMillis(),
    requestCount: design.requestCount ?? 0,
    lastRequestedAtMs: design.lastRequestedAt?.toMillis(),
    lastAddedToShowAtMs: design.lastAddedToShowAt?.toMillis(),
    favoriteCount: 0,
    updatedAtMs: design.updatedAt?.toMillis(),
  };
}

/**
 * Explicitly maps an authoritative Firestore design to the generated card rendering boundary.
 * This prevents a persisted model from being inserted directly into generated card state.
 */
export function authoritativeDesignToGeneratedCard(design: Design): Design {
  return cardToDesign(authoritativeDesignToPortalCatalogCard(design));
}

export function buildGeneratedDesignReconciliation(
  existingEntry: ReadyIndexEntry | null,
  design: Design,
): {
  card: Design;
  entry: ReadyIndexEntry | null;
  preservedSortValue: boolean;
} {
  const card = authoritativeDesignToGeneratedCard(design);
  if (!existingEntry || design.status !== "ready") {
    return {
      card,
      entry: null,
      preservedSortValue: existingEntry !== null,
    };
  }
  return {
    card,
    entry: {
      ...existingEntry,
      ...authoritativeDesignToReadyIndexPatch(design),
    },
    preservedSortValue: true,
  };
}

/**
 * Maps the generated client-safe taxonomy snapshot's categories to Studio's `Category` shape.
 * Only `id`/`name`/`isActive` are ever read by the Design Library's category dropdown/filter logic
 * (`buildCategoryFilterOptions`, `filterDesignsByCategory`) — confirmed by direct inspection.
 * `sortOrder` is carried through since the snapshot has it; audit fields
 * (`createdBy`/`updatedBy`/timestamps) are never read here and are left as safe placeholders. The
 * snapshot only ever contains active categories (`isActive: true` in its own build query), matching
 * the same active-only convention Portal's generated categories already use — an existing,
 * previously-accepted tradeoff, not new: a ready design whose category was deactivated after
 * assignment will show no category label here (same as Portal), instead of Studio's prior
 * Firestore-backed behavior of still showing the inactive category's name for that one design.
 */
export function clientCategoryToCategory(
  category: ClientCatalogReferenceSnapshot["categories"][number],
): Category {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdBy: "",
    updatedBy: "",
    createdAt: undefined as unknown as Category["createdAt"],
    updatedAt: undefined as unknown as Category["updatedAt"],
  };
}

/**
 * Maps the generated client-safe taxonomy snapshot's tags to Studio's `CatalogTag` shape. Only
 * `name`/`aliases`/`status` are ever read by the Design Library's tag-picker suggestion/lookup code
 * (`buildCatalogTagSuggestions`, `resolveCatalogTagCandidate`, `buildCatalogTagLookup`) — confirmed
 * by direct inspection. `preferredWhen` is server-only AI guidance, deliberately excluded from the
 * public snapshot; it is left as an empty string here, which means tag-modal search no longer
 * matches against guidance text (owner-approved narrow behavior change, 2026-07-24) — name/alias
 * matching, the primary path, is unaffected. This is unrelated to `TagManagementModal`, which keeps
 * its own Firestore path (needs the full approved+archived taxonomy with real `preferredWhen` for
 * editing) — out of scope here.
 */
export function clientTagToCatalogTag(
  tag: ClientCatalogReferenceSnapshot["tags"][number],
): CatalogTag {
  return {
    id: tag.id,
    name: tag.name,
    aliases: tag.aliases,
    preferredWhen: "",
    status: tag.status,
    createdBy: "",
    updatedBy: "",
    createdAt: undefined,
    updatedAt: undefined,
  };
}
