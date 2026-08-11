import { randomUUID } from "node:crypto";

import {
  PORTAL_STATIC_OG_IMAGE_MAX_BYTES,
  isAllowedPortalStaticOgImageContentType,
  parsePortalStaticOgImageStoragePath,
  portalStaticOgImageContentTypeFromPath,
  type PortalStaticOgImageSnapshot,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { adminDb, adminStorage } from "./lib/admin";
import { failedPrecondition, invalidArgument } from "./lib/errors";
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

async function ensureDownloadUrlForStoragePath(storagePath: string): Promise<{
  storagePath: string;
  downloadUrl: string;
}> {
  const objectPath = normalizeStorageObjectPath(storagePath);
  const canonical = parsePortalStaticOgImageStoragePath(objectPath);
  if (!canonical) {
    throw invalidArgument("Static OG upload path is invalid.");
  }

  const expectedContentType = portalStaticOgImageContentTypeFromPath(canonical);
  if (!expectedContentType) {
    throw invalidArgument("Static OG upload must be png, jpeg, or webp.");
  }

  const file = adminStorage.bucket().file(canonical);
  const [exists] = await file.exists();
  if (!exists) {
    throw failedPrecondition("Static OG image was not found in Storage.");
  }

  const [metadata] = await file.getMetadata();
  const contentType = typeof metadata.contentType === "string" ? metadata.contentType : "";
  if (
    !isAllowedPortalStaticOgImageContentType(contentType) ||
    contentType !== expectedContentType
  ) {
    throw invalidArgument("Static OG image content type does not match the object path.");
  }

  const sizeRaw = metadata.size;
  const byteSize =
    typeof sizeRaw === "number"
      ? sizeRaw
      : typeof sizeRaw === "string"
        ? Number(sizeRaw)
        : Number.NaN;
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > PORTAL_STATIC_OG_IMAGE_MAX_BYTES) {
    throw invalidArgument(
      `Static OG image must be between 1 byte and ${PORTAL_STATIC_OG_IMAGE_MAX_BYTES} bytes.`,
    );
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

  return {
    storagePath: canonical,
    downloadUrl: buildFirebaseDownloadUrl(file.bucket.name, canonical, token),
  };
}

async function deleteOwnedStaticOgUpload(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) {
    return;
  }
  const canonical = parsePortalStaticOgImageStoragePath(storagePath);
  if (!canonical) {
    return;
  }
  try {
    await adminStorage.bucket().file(canonical).delete({ ignoreNotFound: true });
  } catch {
    // Best-effort cleanup; Firestore remains source of truth for the active snapshot.
  }
}

/**
 * Resolve a new static OG snapshot from an owner upload path (brand-finalize pattern).
 */
export async function resolveStaticOgSnapshotFromUpload(
  storagePath: string,
  previous: PortalStaticOgImageSnapshot | null,
): Promise<PortalStaticOgImageSnapshot> {
  const resolved = await ensureDownloadUrlForStoragePath(storagePath);
  if (previous?.kind === "upload" && previous.storagePath && previous.storagePath !== resolved.storagePath) {
    await deleteOwnedStaticOgUpload(previous.storagePath);
  }
  return {
    kind: "upload",
    storagePath: resolved.storagePath,
    downloadUrl: resolved.downloadUrl,
    sourceDesignId: null,
  };
}

/**
 * Snapshot a ready Design Library asset at Save (path + HTTPS URL + provenance).
 * Does not mutate the design. Explicit designs are rejected.
 */
export async function resolveStaticOgSnapshotFromDesign(
  sourceDesignId: string,
  previous: PortalStaticOgImageSnapshot | null,
): Promise<PortalStaticOgImageSnapshot> {
  const snap = await adminDb.collection("designs").doc(sourceDesignId).get();
  if (!snap.exists) {
    throw failedPrecondition("Selected design was not found.");
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.status !== "ready") {
    throw failedPrecondition("Static OG design picks must be ready catalog designs.");
  }
  if (data.isExplicitContent === true) {
    throw invalidArgument("Explicit Content designs cannot be used for global Open Graph imagery.");
  }

  const previewPath =
    typeof data.previewPath === "string" && data.previewPath.trim()
      ? normalizeStorageObjectPath(data.previewPath)
      : "";
  const thumbnailPath =
    typeof data.thumbnailPath === "string" && data.thumbnailPath.trim()
      ? normalizeStorageObjectPath(data.thumbnailPath)
      : "";
  const storagePath = previewPath || thumbnailPath;
  if (!storagePath) {
    throw failedPrecondition("Selected design has no preview or thumbnail asset.");
  }

  const file = adminStorage.bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw failedPrecondition("Selected design asset was not found in Storage.");
  }

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  if (previous?.kind === "upload") {
    await deleteOwnedStaticOgUpload(previous.storagePath);
  }

  return {
    kind: "design",
    storagePath,
    downloadUrl: url,
    sourceDesignId,
  };
}

/** Prefer HTTPS snapshot; fall back to signing storagePath when needed. */
export async function resolveStaticOgImageUrl(
  snapshot: PortalStaticOgImageSnapshot | null,
): Promise<string | null> {
  if (!snapshot) {
    return null;
  }
  const direct = snapshot.downloadUrl?.trim();
  if (direct && direct.startsWith("https://")) {
    return direct;
  }
  const storagePath = snapshot.storagePath?.trim();
  if (!storagePath) {
    return null;
  }
  try {
    const objectPath = normalizeStorageObjectPath(storagePath);
    const file = adminStorage.bucket().file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return url;
  } catch {
    return null;
  }
}
