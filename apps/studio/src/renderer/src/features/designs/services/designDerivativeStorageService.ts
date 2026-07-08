import { FirebaseError } from "firebase/app";
import { deleteObject, ref, uploadBytes } from "firebase/storage";

import { DERIVATIVE_WEBP_CONTENT_TYPE } from "@fresh-prints/shared/constants/import/derivativeGeneration.constants";
import {
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "@fresh-prints/shared/constants/design/designStoragePaths";
import { assertValidDerivativeWebpUploadBytes } from "@fresh-prints/shared/utils/derivativeWebpValidation";
import { storage } from "../../../config/firebase";
import type {
  DeleteDesignDerivativesResult,
  DerivativeDeleteOutcome,
  UploadDerivativeWebpResult,
} from "../types/derivativeStorage.types";

function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, "");
}

function getStorageUploadErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "storage/unauthorized" || error.code === "storage/unauthenticated") {
      return "You do not have permission to upload derivative files to Firebase Storage.";
    }

    if (error.code === "storage/retry-limit-exceeded" || error.code === "storage/canceled") {
      return "The derivative upload failed due to a network issue. Check your connection and try again.";
    }

    if (error.code === "storage/quota-exceeded") {
      return "Firebase Storage quota was exceeded. Contact an administrator.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to upload the derivative WebP file to Firebase Storage.";
}

function getStorageDeleteWarning(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "storage/object-not-found") {
      return "The derivative file was not found in Firebase Storage.";
    }

    if (error.code === "storage/unauthorized" || error.code === "storage/unauthenticated") {
      return "You do not have permission to delete derivative files from Firebase Storage.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to delete the derivative WebP file from Firebase Storage.";
}

async function uploadDerivativeWebp(
  catalogPath: string,
  bytes: Uint8Array,
): Promise<UploadDerivativeWebpResult> {
  assertValidDerivativeWebpUploadBytes(bytes);

  const storageRef = ref(storage, toFirebaseStorageRefPath(catalogPath));

  try {
    await uploadBytes(storageRef, bytes, {
      contentType: DERIVATIVE_WEBP_CONTENT_TYPE,
    });
  } catch (error) {
    throw new Error(getStorageUploadErrorMessage(error));
  }

  return { catalogPath };
}

async function deleteDerivativeWebpBestEffort(catalogPath: string): Promise<DerivativeDeleteOutcome> {
  const storageRef = ref(storage, toFirebaseStorageRefPath(catalogPath));

  try {
    await deleteObject(storageRef);
    return { path: catalogPath, deleted: true };
  } catch (error) {
    return {
      path: catalogPath,
      deleted: false,
      warning: getStorageDeleteWarning(error),
    };
  }
}

/**
 * Renderer Firebase Storage service for design derivative assets (Phase 3C).
 *
 * Uploads and deletes thumbnail/preview WebP objects at canonical paths.
 * Does not generate images or update Firestore.
 */
export const designDerivativeStorageService = {
  resolveThumbnailPath(designId: string): string {
    return getThumbnailStoragePath(designId);
  },

  resolvePreviewPath(designId: string): string {
    return getPreviewStoragePath(designId);
  },

  async uploadThumbnailWebp(
    designId: string,
    bytes: Uint8Array,
  ): Promise<UploadDerivativeWebpResult> {
    return uploadDerivativeWebp(getThumbnailStoragePath(designId), bytes);
  },

  async uploadPreviewWebp(
    designId: string,
    bytes: Uint8Array,
  ): Promise<UploadDerivativeWebpResult> {
    return uploadDerivativeWebp(getPreviewStoragePath(designId), bytes);
  },

  async deleteThumbnailWebp(designId: string): Promise<DerivativeDeleteOutcome> {
    return deleteDerivativeWebpBestEffort(getThumbnailStoragePath(designId));
  },

  async deletePreviewWebp(designId: string): Promise<DerivativeDeleteOutcome> {
    return deleteDerivativeWebpBestEffort(getPreviewStoragePath(designId));
  },

  async deleteDesignDerivatives(designId: string): Promise<DeleteDesignDerivativesResult> {
    const [thumbnail, preview] = await Promise.all([
      deleteDerivativeWebpBestEffort(getThumbnailStoragePath(designId)),
      deleteDerivativeWebpBestEffort(getPreviewStoragePath(designId)),
    ]);

    return { thumbnail, preview };
  },
};
