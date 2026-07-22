import type { AssistedCreationReferenceImage } from "../../../packages/shared/src/types/assistedCreation/assistedCreation.types";

import { adminStorage } from "./admin";
import { storageObjectPath } from "./storageObjectPath";

/**
 * Client uploads land under `assisted-creation/{uid}/pending/{id}`.
 * Promote into the durable request-scoped path documented in DATA_MODEL:
 * `assisted-creation/{uid}/{requestId}/references/{id}`.
 *
 * Idempotent: paths already under `.../{requestId}/references/` are kept.
 * Missing pending objects keep their original path (Studio can still attempt load).
 */
export async function promoteAssistedCreationReferenceImages(input: {
  customerUid: string;
  requestId: string;
  images: AssistedCreationReferenceImage[];
}): Promise<AssistedCreationReferenceImage[]> {
  const customerUid = input.customerUid.trim();
  const requestId = input.requestId.trim();
  if (!customerUid || !requestId || input.images.length === 0) {
    return input.images.map((image) => ({ ...image }));
  }

  const pendingPrefix = `assisted-creation/${customerUid}/pending/`;
  const referencesPrefix = `assisted-creation/${customerUid}/${requestId}/references/`;
  const bucket = adminStorage.bucket();
  const out: AssistedCreationReferenceImage[] = [];

  for (const image of input.images) {
    const storagePath = typeof image.storagePath === "string" ? image.storagePath.trim() : "";
    if (!storagePath) {
      out.push({ ...image });
      continue;
    }
    if (storagePath.startsWith(referencesPrefix)) {
      out.push({ ...image, storagePath });
      continue;
    }
    if (!storagePath.startsWith(pendingPrefix)) {
      // Unexpected path — keep as-is so staff can still see metadata.
      out.push({ ...image, storagePath });
      continue;
    }

    const id = typeof image.id === "string" && image.id.trim() ? image.id.trim() : "";
    const destPath = id
      ? `${referencesPrefix}${id}`
      : `${referencesPrefix}${storagePath.slice(pendingPrefix.length)}`;

    try {
      const source = bucket.file(storageObjectPath(storagePath));
      const [exists] = await source.exists();
      if (!exists) {
        out.push({ ...image, storagePath });
        continue;
      }
      const dest = bucket.file(storageObjectPath(destPath));
      await source.copy(dest);
      if (image.contentType?.trim()) {
        try {
          await dest.setMetadata({ contentType: image.contentType.trim() });
        } catch {
          // Metadata is best-effort; bytes already copied.
        }
      }
      try {
        await source.delete({ ignoreNotFound: true });
      } catch {
        // Non-fatal — durable copy already exists.
      }
      out.push({ ...image, storagePath: destPath });
    } catch {
      out.push({ ...image, storagePath });
    }
  }

  return out;
}
