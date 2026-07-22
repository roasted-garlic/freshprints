import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  BRAND_LOGO_CONTENT_TYPE,
  BRAND_LOGO_MAX_BYTES,
  BRAND_LOGO_SETTINGS_DOC_ID,
  brandLogoFieldKey,
  parseBrandLogoFinalizeInput,
  resolveBrandLogoSettings,
  type BrandLogoSettings,
  type BrandLogoSlotRecord,
} from "../../packages/shared/src/constants/brand/brandLogoSettings.constants";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { normalizeStorageObjectPath } from "./lib/portalOgUrls";

function buildFirebaseDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

function firstDownloadToken(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const token = raw.split(",")[0]?.trim();
  return token || null;
}

async function resolveAuthoritativeSlotFromStorage(
  storagePath: string,
): Promise<Omit<BrandLogoSlotRecord, "updatedAt" | "updatedBy">> {
  const objectPath = normalizeStorageObjectPath(storagePath);
  const file = adminStorage.bucket().file(objectPath);
  const [exists] = await file.exists();
  if (!exists) {
    throw failedPrecondition("Brand logo object was not found in Storage.");
  }

  const [metadata] = await file.getMetadata();
  const contentType = typeof metadata.contentType === "string" ? metadata.contentType : "";
  if (contentType !== BRAND_LOGO_CONTENT_TYPE) {
    throw invalidArgument("Brand logo must be image/png.");
  }

  const sizeRaw = metadata.size;
  const byteSize =
    typeof sizeRaw === "number"
      ? sizeRaw
      : typeof sizeRaw === "string"
        ? Number(sizeRaw)
        : Number.NaN;
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > BRAND_LOGO_MAX_BYTES) {
    throw invalidArgument(`Brand logo must be between 1 byte and ${BRAND_LOGO_MAX_BYTES} bytes.`);
  }

  const custom = (metadata.metadata ?? {}) as Record<string, unknown>;
  let token = firstDownloadToken(custom.firebaseStorageDownloadTokens);
  if (!token) {
    token = randomUUID();
    await file.setMetadata({
      metadata: {
        ...custom,
        firebaseStorageDownloadTokens: token,
      },
    });
  }

  const bucketName = file.bucket.name;
  return {
    storagePath: objectPath,
    downloadUrl: buildFirebaseDownloadUrl(bucketName, objectPath, token),
    contentType: BRAND_LOGO_CONTENT_TYPE,
    byteSize: Math.floor(byteSize),
  };
}

async function deleteStorageObject(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) {
    return;
  }
  const objectPath = normalizeStorageObjectPath(storagePath);
  if (!objectPath) {
    return;
  }
  try {
    await adminStorage.bucket().file(objectPath).delete({ ignoreNotFound: true });
  } catch {
    // Best-effort cleanup; Firestore remains source of truth for active slots.
  }
}

export const finalizeBrandLogoSlot = onCall(async (request): Promise<BrandLogoSettings> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }
  const caller = await loadCallerProfile(request.auth.uid);
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only active owners can update brand logos.");
  }

  const parsed = parseBrandLogoFinalizeInput(request.data);
  if (!parsed) {
    throw invalidArgument("app, slot, and a valid storagePath (or clear: true) are required.");
  }

  const fieldKey = brandLogoFieldKey(parsed.app, parsed.slot);
  const docRef = adminDb.collection("settings").doc(BRAND_LOGO_SETTINGS_DOC_ID);
  const existingSnap = await docRef.get();
  const existing = resolveBrandLogoSettings(existingSnap.data());
  const previous = existing[fieldKey];

  if (parsed.clear) {
    await docRef.set(
      {
        [fieldKey]: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true },
    );
    await deleteStorageObject(previous?.storagePath);
    const clearedSnap = await docRef.get();
    return resolveBrandLogoSettings(clearedSnap.data());
  }

  const authoritative = await resolveAuthoritativeSlotFromStorage(parsed.storagePath);
  const slot: BrandLogoSlotRecord = {
    ...authoritative,
    updatedBy: request.auth.uid,
  };
  if (parsed.aspectRatio !== undefined) {
    slot.aspectRatio = parsed.aspectRatio;
  }

  await docRef.set(
    {
      [fieldKey]: {
        ...slot,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    },
    { merge: true },
  );

  if (previous?.storagePath && previous.storagePath !== authoritative.storagePath) {
    await deleteStorageObject(previous.storagePath);
  }

  const nextSnap = await docRef.get();
  return resolveBrandLogoSettings(nextSnap.data());
});
