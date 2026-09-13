import {
  buildStaffArtworkProjectionEnrichment,
  projectPortalPrintRequestItem,
  type StaffArtworkProjectionEnrichment,
} from "../../../packages/shared/src/utils/portalPrintRequestItemProjection";
import { adminDb } from "./admin";

export async function loadStaffArtworkProjectionEnrichment(
  staffArtworkId: string | undefined,
): Promise<StaffArtworkProjectionEnrichment | null> {
  const id = typeof staffArtworkId === "string" ? staffArtworkId.trim() : "";
  if (!id) return null;
  const snap = await adminDb.collection("staffArtworks").doc(id).get();
  if (!snap.exists) return null;
  return buildStaffArtworkProjectionEnrichment((snap.data() ?? {}) as Record<string, unknown>);
}

export async function projectCanonicalPrintRequestItem(
  itemId: string,
  canonicalData: Record<string, unknown>,
) {
  const staffArtworkId =
    typeof canonicalData.staffArtworkId === "string" ? canonicalData.staffArtworkId.trim() : undefined;
  const isStaffArtwork =
    canonicalData.sourceType === "staff_artwork" || Boolean(staffArtworkId);
  const enrichment = isStaffArtwork
    ? await loadStaffArtworkProjectionEnrichment(staffArtworkId)
    : null;
  return projectPortalPrintRequestItem(itemId, canonicalData, enrichment);
}

export async function writePortalPrintRequestItemProjection(
  itemId: string,
  canonicalData: Record<string, unknown> | null | undefined,
): Promise<"set" | "delete"> {
  const projectionRef = adminDb.collection("portalPrintRequestItems").doc(itemId);
  if (!canonicalData) {
    await projectionRef.delete();
    return "delete";
  }
  const projection = await projectCanonicalPrintRequestItem(itemId, canonicalData);
  if (!projection) {
    await projectionRef.delete();
    return "delete";
  }
  await projectionRef.set(projection);
  return "set";
}

/** Reproject every canonical printRequestItems row attached to a Staff Artwork. */
export async function refreshPortalProjectionsForStaffArtwork(staffArtworkId: string): Promise<number> {
  const id = staffArtworkId.trim();
  if (!id) return 0;
  const items = await adminDb.collection("printRequestItems").where("staffArtworkId", "==", id).get();
  let updated = 0;
  for (const doc of items.docs) {
    await writePortalPrintRequestItemProjection(doc.id, (doc.data() ?? {}) as Record<string, unknown>);
    updated += 1;
  }
  return updated;
}
