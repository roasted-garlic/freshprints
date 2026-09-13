import {
  collection,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import type { StaffArtwork, StaffArtworkSummary } from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";
import { db, functions, storage } from "../../../config/firebase";
import type { User } from "../../users/types/user.types";
import { permissionService } from "../../permissions/services/permissionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

const COLLECTION = "staffArtworks";

function assertView(caller: User): void {
  if (!permissionService.canViewStaffArtwork(caller)) throw new Error("You do not have permission to view Staff Artwork.");
}

function mapArtwork(id: string, data: DocumentData): StaffArtwork {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);
  if (!createdAt || !updatedAt) throw new Error("A Staff Artwork record is incomplete.");
  return {
    ...(data as Omit<StaffArtwork, "id" | "createdAt" | "updatedAt">),
    id,
    createdAt,
    updatedAt,
  } as StaffArtwork;
}

function mapSummary(artwork: StaffArtwork): StaffArtworkSummary {
  return {
    id: artwork.id,
    title: artwork.title,
    description: artwork.description,
    customerId: artwork.customerId,
    customerDisplayNameSnapshot: artwork.customerDisplayNameSnapshot,
    customerUsernameSnapshot: artwork.customerUsernameSnapshot,
    artworkBackgroundHex: artwork.artworkBackgroundHex ?? null,
    status: artwork.status,
    previewStoragePath: artwork.previewStoragePath,
    thumbnailStoragePath: artwork.thumbnailStoragePath,
    widthPx: artwork.processing?.widthPx,
    heightPx: artwork.processing?.heightPx,
    effectiveDpi: artwork.processing?.effectiveDpi,
    processingWarning: artwork.processing?.processingWarning,
  };
}

function isFirestoreIndexUnavailable(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /requires an index|index.*building|failed-precondition/i.test(message);
}

async function listWithoutCompositeIndex(
  options: { customerId?: string; fromServer?: boolean },
): Promise<StaffArtworkSummary[]> {
  const readDocs = options.fromServer ? getDocsFromServer : getDocs;
  const statuses = ["ready", "processing", "failed", "archived"] as const;
  const snapshots = await Promise.all(
    statuses.map((status) => {
      const constraints = [where("status", "==", status), limit(100)];
      if (options.customerId) {
        constraints.unshift(where("customerId", "==", options.customerId));
      }
      return readDocs(query(collection(db, COLLECTION), ...constraints));
    }),
  );
  const byId = new Map<string, StaffArtwork>();
  for (const snapshot of snapshots) {
    for (const entry of snapshot.docs) {
      byId.set(entry.id, mapArtwork(entry.id, entry.data()));
    }
  }
  return [...byId.values()]
    .sort((left, right) => right.createdAt.toMillis() - left.createdAt.toMillis())
    .map(mapSummary);
}

export const staffArtworkService = {
  async list(
    caller: User,
    options: { customerId?: string; fromServer?: boolean } = {},
  ): Promise<StaffArtworkSummary[]> {
    assertView(caller);
    const readDocs = options.fromServer ? getDocsFromServer : getDocs;
    const constraints = [
      where("status", "in", ["ready", "processing", "failed", "archived"]),
      orderBy("createdAt", "desc"),
      limit(100),
    ];
    if (options.customerId) constraints.splice(1, 0, where("customerId", "==", options.customerId));
    try {
      const snapshot = await readDocs(query(collection(db, COLLECTION), ...constraints));
      return snapshot.docs.map((entry) => mapSummary(mapArtwork(entry.id, entry.data())));
    } catch (cause) {
      if (!isFirestoreIndexUnavailable(cause)) throw cause;
      // Composite indexes can take minutes after first deploy; keep the page usable.
      return listWithoutCompositeIndex(options);
    }
  },

  async getById(caller: User, staffArtworkId: string): Promise<StaffArtwork> {
    assertView(caller);
    const { getDoc, doc } = await import("firebase/firestore");
    const snapshot = await getDoc(doc(db, COLLECTION, staffArtworkId));
    if (!snapshot.exists()) throw new Error("Staff Artwork was not found.");
    return mapArtwork(snapshot.id, snapshot.data());
  },

  async createAndUpload(
    caller: User,
    file: File,
    input: {
      title?: string;
      description?: string;
      customerId?: string | null;
      /** Upload picker: Auto runs dark-mat detection on finalize; Light/Dark force the mat. */
      artworkBackgroundChoice?: "auto" | "light" | "dark";
      artworkBackgroundHex?: string | null;
    },
    options?: {
      onProgress?: (update: { percent: number; label: string; phase: "create" | "upload" | "process" | "done" }) => void;
    },
  ): Promise<StaffArtwork> {
    if (!permissionService.canManageStaffArtwork(caller)) {
      throw new Error("Only owners and admins may upload Staff Artwork.");
    }

    const report = (
      percent: number,
      label: string,
      phase: "create" | "upload" | "process" | "done",
    ) => {
      options?.onProgress?.({ percent: Math.max(0, Math.min(100, Math.round(percent))), label, phase });
    };

    report(4, "Preparing upload…", "create");
    const normalizedType = (file.type || "").toLowerCase();
    const looksLikePng =
      normalizedType === "image/png" || (normalizedType === "" && /\.png$/i.test(file.name));
    if (!looksLikePng) {
      throw new Error("Only PNG uploads are supported for Staff Artwork.");
    }
    const create = httpsCallable<
      {
        title?: string;
        description?: string;
        sourceFileName: string;
        contentType: string;
        customerId?: string | null;
        artworkBackgroundChoice?: "auto" | "light" | "dark";
        artworkBackgroundHex?: string | null;
      },
      { staffArtworkId: string; sourceStoragePath: string }
    >(functions, "createStaffArtworkUpload");
    const created = await create({
      ...input,
      sourceFileName: file.name,
      contentType: file.type || "image/png",
    });
    report(12, "Uploading file…", "upload");

    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(ref(storage, created.data.sourceStoragePath), file, {
        contentType: file.type || "image/png",
      });
      task.on(
        "state_changed",
        (snapshot) => {
          const ratio =
            snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
          // Storage upload spans 12% → 58% of the overall file progress.
          report(12 + ratio * 46, "Uploading file…", "upload");
        },
        (error) => reject(error),
        () => resolve(),
      );
    });

    report(62, "Processing artwork…", "process");
    const finalize = httpsCallable<{ staffArtworkId: string }, { staffArtworkId: string }>(
      functions,
      "finalizeStaffArtwork",
    );
    await finalize({ staffArtworkId: created.data.staffArtworkId });
    report(92, "Finishing…", "process");
    const artwork = await this.getById(caller, created.data.staffArtworkId);
    report(100, "Ready", "done");
    return artwork;
  },

  async update(
    caller: User,
    input: {
      staffArtworkId: string;
      title: string;
      description?: string;
      customerId?: string | null;
      artworkBackgroundHex?: string | null;
    },
  ): Promise<void> {
    if (!permissionService.canManageStaffArtwork(caller)) throw new Error("Only owners and admins may edit Staff Artwork.");
    const call = httpsCallable(functions, "updateStaffArtwork");
    await call(input);
  },

  async setArchived(caller: User, staffArtworkId: string, archived: boolean): Promise<void> {
    if (!permissionService.canManageStaffArtwork(caller)) throw new Error("Only owners and admins may archive Staff Artwork.");
    const call = httpsCallable(functions, "setStaffArtworkArchiveState");
    await call({ staffArtworkId, archived });
  },

  async delete(caller: User, staffArtworkId: string, confirm = false): Promise<{ canDelete: boolean; blockers: string[] }> {
    if (!permissionService.canManageStaffArtwork(caller)) throw new Error("Only owners and admins may delete Staff Artwork.");
    const call = httpsCallable<unknown, { canDelete: boolean; blockers: string[] }>(functions, "deleteEligibleStaffArtwork");
    const result = await call({ staffArtworkId, confirm });
    return result.data;
  },

  async promote(caller: User, staffArtworkId: string): Promise<{ designId: string; alreadyPromoted: boolean }> {
    if (!permissionService.canManageStaffArtwork(caller)) throw new Error("Only owners and admins may promote Staff Artwork.");
    const call = httpsCallable<unknown, { designId: string; alreadyPromoted: boolean }>(functions, "promoteStaffArtworkToAiReview");
    const result = await call({ staffArtworkId });
    return result.data;
  },

  async getPreviewUrl(caller: User, path: string | null | undefined): Promise<string | null> {
    assertView(caller);
    if (!path) return null;
    return getDownloadURL(ref(storage, path));
  },
};
