import type { Firestore } from "firebase-admin/firestore";

import type { PortalShowCatalogDesignCard } from "../../../packages/shared/src/types/portal/listPortalShowCatalogDesigns.types";

const CATALOG_UPLOAD_SOURCE_TYPES = new Set(["customer_upload"]);

export function isCatalogDesignAllocation(data: Record<string, unknown>): boolean {
  const sourceType = typeof data.sourceType === "string" ? data.sourceType : "catalog_design";
  if (CATALOG_UPLOAD_SOURCE_TYPES.has(sourceType)) {
    return false;
  }
  if (typeof data.customerUploadId === "string" && data.customerUploadId.trim()) {
    return false;
  }
  return typeof data.designId === "string" && data.designId.trim().length > 0;
}

export async function countUniquePublicCatalogDesignsByShowId(
  db: Firestore,
  showIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (showIds.length === 0) {
    return counts;
  }

  const designIdsByShow = new Map<string, Set<string>>();

  for (let index = 0; index < showIds.length; index += 30) {
    const chunk = showIds.slice(index, index + 30);
    const snap = await db
      .collection("showAllocations")
      .where("upcomingShowId", "in", chunk)
      .get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.status === "canceled" || !isCatalogDesignAllocation(data)) {
        continue;
      }

      const showId = typeof data.upcomingShowId === "string" ? data.upcomingShowId : "";
      const designId = typeof data.designId === "string" ? data.designId : "";
      if (!showId || !designId) {
        continue;
      }

      const set = designIdsByShow.get(showId) ?? new Set<string>();
      set.add(designId);
      designIdsByShow.set(showId, set);
    }
  }

  const allDesignIds = [...new Set([...designIdsByShow.values()].flatMap((set) => [...set]))];
  const readyDesignIds = new Set<string>();

  for (let index = 0; index < allDesignIds.length; index += 30) {
    const chunk = allDesignIds.slice(index, index + 30);
    const designsSnap = await db
      .collection("designs")
      .where("__name__", "in", chunk)
      .get();

    for (const designDoc of designsSnap.docs) {
      if (designDoc.data().status === "ready") {
        readyDesignIds.add(designDoc.id);
      }
    }
  }

  for (const [showId, designIds] of designIdsByShow.entries()) {
    let count = 0;
    for (const designId of designIds) {
      if (readyDesignIds.has(designId)) {
        count += 1;
      }
    }
    counts.set(showId, count);
  }

  return counts;
}

export async function listPublicCatalogDesignCardsForShow(
  db: Firestore,
  upcomingShowId: string,
): Promise<{ designIds: string[]; cards: PortalShowCatalogDesignCard[] }> {
  const allocationsSnap = await db
    .collection("showAllocations")
    .where("upcomingShowId", "==", upcomingShowId)
    .get();

  const orderedDesignIds: string[] = [];
  const seen = new Set<string>();

  for (const docSnap of allocationsSnap.docs) {
    const data = docSnap.data();
    if (data.status === "canceled" || !isCatalogDesignAllocation(data)) {
      continue;
    }
    const designId = typeof data.designId === "string" ? data.designId : "";
    if (!designId || seen.has(designId)) {
      continue;
    }
    seen.add(designId);
    orderedDesignIds.push(designId);
  }

  const cards: PortalShowCatalogDesignCard[] = [];

  for (let index = 0; index < orderedDesignIds.length; index += 30) {
    const chunk = orderedDesignIds.slice(index, index + 30);
    const designsSnap = await db
      .collection("designs")
      .where("__name__", "in", chunk)
      .get();

    const byId = new Map(designsSnap.docs.map((doc) => [doc.id, doc.data()]));

    for (const designId of chunk) {
      const data = byId.get(designId);
      if (!data || data.status !== "ready") {
        continue;
      }

      cards.push({
        id: designId,
        title: typeof data.title === "string" ? data.title : "Untitled",
        thumbnailPath: typeof data.thumbnailPath === "string" ? data.thumbnailPath : undefined,
        categoryId: typeof data.categoryId === "string" ? data.categoryId : undefined,
        tags: Array.isArray(data.tags)
          ? data.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        isExplicitContent: data.isExplicitContent === true,
      });
    }
  }

  const cardOrder = new Map(orderedDesignIds.map((id, index) => [id, index]));
  cards.sort(
    (left, right) =>
      (cardOrder.get(String(left.id)) ?? 0) - (cardOrder.get(String(right.id)) ?? 0),
  );

  return { designIds: orderedDesignIds, cards };
}
