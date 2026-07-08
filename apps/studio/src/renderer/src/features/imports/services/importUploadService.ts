import { FirebaseError } from "firebase/app";
import { deleteObject, ref, uploadBytesResumable } from "firebase/storage";

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
