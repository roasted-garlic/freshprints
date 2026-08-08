import { FirebaseError } from "firebase/app";
import { deleteObject, ref, uploadBytesResumable } from "firebase/storage";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "@fresh-prints/shared/constants/importValidation.constants";
import { formatPngSizeLimitExceededMessage } from "@fresh-prints/shared/utils/importLimitMessages";
import { storage } from "../../../config/firebase";
import { getOriginalStoragePath } from "../../designs/constants/designStoragePaths";
import type { UploadCancelToken } from "../utils/uploadCancelToken";

const PNG_CONTENT_TYPE = "image/png";

function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, "");
}

function getStorageUploadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "storage/unauthorized" || error.code === "storage/unauthenticated") {
      return "You do not have permission to upload design files to Firebase Storage.";
    }

    if (error.code === "storage/retry-limit-exceeded" || error.code === "storage/canceled") {
      return "The upload failed due to a network issue. Check your connection and try again.";
    }

    if (error.code === "storage/quota-exceeded") {
      return "Firebase Storage quota was exceeded. Contact an administrator.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to upload the PNG file to Firebase Storage.";
}

function getStorageDeleteErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "storage/unauthorized" || error.code === "storage/unauthenticated") {
      return "You do not have permission to delete design files from Firebase Storage.";
    }

    if (error.code === "storage/object-not-found") {
      return "The uploaded file was not found in Firebase Storage.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to delete the uploaded PNG file from Firebase Storage.";
}

export const importUploadService = {
  async uploadOriginalPng(designId: string, bytes: Uint8Array, cancelToken?: UploadCancelToken) {
    const originalPath = getOriginalStoragePath(designId);
    const storageRef = ref(storage, toFirebaseStorageRefPath(originalPath));

    if (cancelToken?.isCancelled) {
      throw new Error("The upload was canceled.");
    }

    // Amendment 2, Defect B: pngValidator.ts's MAX_SINGLE_PNG_SIZE_BYTES check only covers the
    // original on-disk file (pre-trim/upscale) — the final uploaded buffer (post-trim, post-
    // upscale) was never re-checked, so a legitimately-large source that upscales past 150MB hit
    // storage.rules' isValidOriginalUpload() ceiling server-side and surfaced as a misleading
    // "permission" error instead of an accurate size-limit one.
    if (bytes.byteLength > MAX_SINGLE_PNG_SIZE_BYTES) {
      throw new Error(formatPngSizeLimitExceededMessage());
    }

    const uploadTask = uploadBytesResumable(storageRef, bytes, {
      contentType: PNG_CONTENT_TYPE,
    });
    const unregister = cancelToken?.registerTask({ cancel: () => uploadTask.cancel() });

    try {
      await uploadTask;
    } catch (error) {
      throw new Error(getStorageUploadErrorMessage(error));
    } finally {
      unregister?.();
    }

    return {
      designId,
      originalPath,
      status: "uploaded" as const,
    };
  },

  async deleteOriginalPng(designId: string): Promise<void> {
    const originalPath = getOriginalStoragePath(designId);
    const storageRef = ref(storage, toFirebaseStorageRefPath(originalPath));

    try {
      await deleteObject(storageRef);
    } catch (error) {
      throw new Error(getStorageDeleteErrorMessage(error));
    }
  },
};
