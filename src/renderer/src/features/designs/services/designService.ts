import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "../../firebase/utils/firestoreErrorMessage";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import { isCanonicalDesignStoragePath } from "../constants/designStoragePaths";
import type { CreateDesignInput, Design, UpdateDesignInput } from "../types/design.types";
import type { AiReviewStateUpdate, CatalogApprovalUpdate } from "../types/aiReview.types";
import { isAiReviewStatus } from "../types/aiReview.types";
import type { DesignListQuery } from "../types/designQuery.types";
import { isDesignStatus, isWritableDesignStatus } from "../types/designStatus.types";
import { normalizeDesignTags } from "../utils/designTagNormalizer";
import { isOperationalDesignStatus, resolveRestoreStatus } from "../utils/designArchiveRestore";
import {
  buildStaffPrintSizePersistenceFields,
  type StaffPrintSizeInput,
} from "../../../../../../shared/utils/staffPrintSizeEdit";

const DEFAULT_LIST_LIMIT = 100;
const MAX_TITLE_LENGTH = 200;

interface DesignDocumentData {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  categoryId?: unknown;
  tags?: unknown;
  status?: unknown;
  originalPath?: unknown;
  thumbnailPath?: unknown;
  previewPath?: unknown;
  width?: unknown;
  height?: unknown;
  dpi?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  printAspectRatioLocked?: unknown;
  metadataDpiX?: unknown;
  metadataDpiY?: unknown;
  effectiveDpi?: unknown;
  printSizeSource?: unknown;
  uploadedBy?: unknown;
  requestedByCustomerId?: unknown;
  queueCount?: unknown;
  aiProcessed?: unknown;
  aiReviewed?: unknown;
  aiReviewStatus?: unknown;
  aiReviewedAt?: unknown;
  aiReviewedBy?: unknown;
  aiReviewVersion?: unknown;
  aiReviewNotes?: unknown;
  aiReviewConfidence?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  previousStatus?: unknown;
  archivedAt?: unknown;
  archivedBy?: unknown;
}

function mapDesignDocument(designId: string, data: DesignDocumentData): Design {
  if (
    typeof data.title !== "string" ||
    !Array.isArray(data.tags) ||
    !data.tags.every((tag) => typeof tag === "string") ||
    !isDesignStatus(data.status) ||
    typeof data.originalPath !== "string" ||
    typeof data.thumbnailPath !== "string" ||
    typeof data.uploadedBy !== "string" ||
    typeof data.queueCount !== "number" ||
    typeof data.aiProcessed !== "boolean" ||
    typeof data.aiReviewed !== "boolean" ||
    !data.createdAt ||
    !data.updatedAt
  ) {
    throw new Error("A design record is incomplete.");
  }

  return {
    id: designId,
    title: data.title,
    description: typeof data.description === "string" ? data.description : undefined,
    categoryId: typeof data.categoryId === "string" ? data.categoryId : undefined,
    tags: data.tags,
    status: data.status,
    originalPath: data.originalPath,
    thumbnailPath: data.thumbnailPath,
    previewPath: typeof data.previewPath === "string" ? data.previewPath : undefined,
    width: typeof data.width === "number" ? data.width : undefined,
    height: typeof data.height === "number" ? data.height : undefined,
    dpi: typeof data.dpi === "number" ? data.dpi : undefined,
    printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : undefined,
    printHeightInches:
      typeof data.printHeightInches === "number" ? data.printHeightInches : undefined,
    printAspectRatioLocked:
      typeof data.printAspectRatioLocked === "boolean" ? data.printAspectRatioLocked : undefined,
    metadataDpiX: typeof data.metadataDpiX === "number" ? data.metadataDpiX : undefined,
    metadataDpiY: typeof data.metadataDpiY === "number" ? data.metadataDpiY : undefined,
    effectiveDpi: typeof data.effectiveDpi === "number" ? data.effectiveDpi : undefined,
    printSizeSource:
      data.printSizeSource === "import_normalized" ||
      data.printSizeSource === "staff_edited" ||
      data.printSizeSource === "metadata_inferred"
        ? data.printSizeSource
        : undefined,
    uploadedBy: data.uploadedBy,
    requestedByCustomerId:
      typeof data.requestedByCustomerId === "string" ? data.requestedByCustomerId : undefined,
    queueCount: data.queueCount,
    aiProcessed: data.aiProcessed,
    aiReviewed: data.aiReviewed,
    aiReviewStatus:
      typeof data.aiReviewStatus === "string" && isAiReviewStatus(data.aiReviewStatus)
        ? data.aiReviewStatus
        : undefined,
    aiReviewedAt: data.aiReviewedAt ? (data.aiReviewedAt as Design["aiReviewedAt"]) : undefined,
    aiReviewedBy: typeof data.aiReviewedBy === "string" ? data.aiReviewedBy : undefined,
    aiReviewVersion: typeof data.aiReviewVersion === "string" ? data.aiReviewVersion : undefined,
    aiReviewNotes: typeof data.aiReviewNotes === "string" ? data.aiReviewNotes : undefined,
    aiReviewConfidence:
      typeof data.aiReviewConfidence === "number" ? data.aiReviewConfidence : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : data.uploadedBy,
    updatedBy:
      typeof data.updatedBy === "string"
        ? data.updatedBy
        : typeof data.createdBy === "string"
          ? data.createdBy
          : data.uploadedBy,
    createdAt: data.createdAt as Design["createdAt"],
    updatedAt: data.updatedAt as Design["updatedAt"],
    previousStatus:
      typeof data.previousStatus === "string" &&
      isDesignStatus(data.previousStatus) &&
      isOperationalDesignStatus(data.previousStatus)
        ? data.previousStatus
        : undefined,
    archivedAt: data.archivedAt ? (data.archivedAt as Design["archivedAt"]) : undefined,
    archivedBy: typeof data.archivedBy === "string" ? data.archivedBy : undefined,
  };
}

function validateWritableDesignStatus(status: string): void {
  if (!isDesignStatus(status)) {
    throw new Error("The design status is invalid.");
  }

  if (!isWritableDesignStatus(status)) {
    throw new Error(
      "The statuses queued and printed are deprecated on designs. Use production queue items for production workflow.",
    );
  }
}

function validateTitle(title: string): string {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("A design title is required.");
  }

  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`Design titles must be ${MAX_TITLE_LENGTH} characters or fewer.`);
  }

  return trimmedTitle;
}

function validateOptionalOriginalPath(
  originalPath: string | undefined,
  designId: string,
): string {
  const trimmedPath = originalPath?.trim() ?? "";

  if (!trimmedPath) {
    return "";
  }

  if (!isCanonicalDesignStoragePath(trimmedPath, "originals")) {
    throw new Error("Original storage paths must follow /originals/{designId}.png.");
  }

  if (!trimmedPath.includes(`/${designId}.png`)) {
    throw new Error("The original storage path must use the same design ID as the record.");
  }

  return trimmedPath;
}

function validateOptionalDerivativePath(path: string | undefined, root: "thumbnails" | "previews", designId: string) {
  if (!path) {
    return undefined;
  }

  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return undefined;
  }

  if (!isCanonicalDesignStoragePath(trimmedPath, root)) {
    throw new Error(`Storage paths must follow /${root}/{designId}.webp.`);
  }

  if (!trimmedPath.includes(`/${designId}.webp`)) {
    throw new Error(`The ${root} storage path must use the same design ID as the record.`);
  }

  return trimmedPath;
}

function validateStaffPrintSizeUpdate(
  existingData: DesignDocumentData,
  input: UpdateDesignInput,
): StaffPrintSizeInput | null {
  const hasPrintFieldUpdate =
    input.printWidthInches !== undefined ||
    input.printHeightInches !== undefined ||
    input.printAspectRatioLocked !== undefined;

  if (!hasPrintFieldUpdate) {
    return null;
  }

  const pixelWidth = typeof existingData.width === "number" ? existingData.width : undefined;
  const pixelHeight = typeof existingData.height === "number" ? existingData.height : undefined;

  if (
    pixelWidth === undefined ||
    pixelHeight === undefined ||
    pixelWidth <= 0 ||
    pixelHeight <= 0
  ) {
    throw new Error("Print settings cannot be saved without pixel dimensions.");
  }

  const printWidthInches =
    input.printWidthInches ??
    (typeof existingData.printWidthInches === "number"
      ? existingData.printWidthInches
      : undefined);
  const printHeightInches =
    input.printHeightInches ??
    (typeof existingData.printHeightInches === "number"
      ? existingData.printHeightInches
      : undefined);
  const printAspectRatioLocked =
    input.printAspectRatioLocked ??
    (typeof existingData.printAspectRatioLocked === "boolean"
      ? existingData.printAspectRatioLocked
      : true);

  if (printWidthInches === undefined || printHeightInches === undefined) {
    throw new Error("Print width and height are required.");
  }

  return {
    pixelWidth,
    pixelHeight,
    printWidthInches,
    printHeightInches,
    printAspectRatioLocked,
  };
}

function buildDesignListConstraints(listQuery: DesignListQuery = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (listQuery.status) {
    constraints.push(where("status", "==", listQuery.status));
  }

  if (listQuery.categoryId) {
    constraints.push(where("categoryId", "==", listQuery.categoryId));
  }

  if (listQuery.tag) {
    constraints.push(where("tags", "array-contains", listQuery.tag.trim().toLowerCase()));
  }

  constraints.push(orderBy("updatedAt", "desc"));
  constraints.push(limit(listQuery.limitCount ?? DEFAULT_LIST_LIMIT));

  return constraints;
}

export const designService = {
  generateDesignId(): string {
    return doc(firestoreCollectionService.getDesignsCollection()).id;
  },

  async listDesigns(caller: User, listQuery: DesignListQuery = {}): Promise<Design[]> {
    if (!permissionService.canViewDesigns(caller)) {
      return [];
    }

    try {
      const designsQuery = query(
        firestoreCollectionService.getDesignsCollection(),
        ...buildDesignListConstraints(listQuery),
      );
      const snapshot = await getDocs(designsQuery);

      return snapshot.docs.map((designDocument) =>
        mapDesignDocument(designDocument.id, designDocument.data()),
      );
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to load designs. Please try again."));
    }
  },

  async getDesignById(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canViewDesigns(caller)) {
      throw new Error("You do not have permission to view designs.");
    }

    try {
      const designSnapshot = await getDoc(
        doc(firestoreCollectionService.getDesignsCollection(), designId),
      );

      if (!designSnapshot.exists()) {
        throw new Error("The requested design was not found.");
      }

      return mapDesignDocument(designSnapshot.id, designSnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message === "The requested design was not found.") {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to load the design. Please try again."));
    }
  },

  async createDesign(caller: User, input: CreateDesignInput): Promise<Design> {
    if (!permissionService.canCreateDesigns(caller)) {
      throw new Error("You do not have permission to create designs.");
    }

    const designsCollection = firestoreCollectionService.getDesignsCollection();
    const designRef = input.id ? doc(designsCollection, input.id) : doc(designsCollection);
    const designId = designRef.id;
    const title = validateTitle(input.title);
    const status = input.status ?? "ready";
    validateWritableDesignStatus(status);

    const originalPath = validateOptionalOriginalPath(input.originalPath, designId);
    const thumbnailPath =
      validateOptionalDerivativePath(input.thumbnailPath, "thumbnails", designId) ?? "";
    const previewPath = validateOptionalDerivativePath(input.previewPath, "previews", designId);
    const tags = normalizeDesignTags(input.tags ?? []);

    const designRecord = withoutUndefinedFields({
      id: designId,
      title,
      description: input.description?.trim() || undefined,
      categoryId: input.categoryId?.trim() || undefined,
      tags,
      status,
      originalPath,
      thumbnailPath,
      previewPath,
      width: input.width,
      height: input.height,
      dpi: input.dpi,
      printWidthInches: input.printWidthInches,
      printHeightInches: input.printHeightInches,
      printAspectRatioLocked: input.printAspectRatioLocked,
      metadataDpiX: input.metadataDpiX,
      metadataDpiY: input.metadataDpiY,
      effectiveDpi: input.effectiveDpi,
      printSizeSource: input.printSizeSource,
      uploadedBy: caller.id,
      requestedByCustomerId: input.requestedByCustomerId?.trim() || undefined,
      queueCount: 0,
      aiProcessed: input.aiProcessed ?? false,
      aiReviewed: input.aiReviewed ?? false,
      aiReviewStatus: input.aiReviewStatus,
      createdBy: caller.id,
      updatedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await setDoc(designRef, designRecord);
      const createdSnapshot = await getDoc(designRef);

      if (!createdSnapshot.exists()) {
        throw new Error("The design record could not be created.");
      }

      return mapDesignDocument(createdSnapshot.id, createdSnapshot.data());
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to create the design. Please try again."));
    }
  },

  async updateDesign(caller: User, designId: string, input: UpdateDesignInput): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to edit designs.");
    }

    if (Object.keys(input).length === 0) {
      throw new Error("No design changes were provided.");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: caller.id,
    };

    if (input.title !== undefined) {
      updatePayload.title = validateTitle(input.title);
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description.trim() ? input.description.trim() : deleteField();
    }

    if (input.categoryId !== undefined) {
      updatePayload.categoryId = input.categoryId.trim() ? input.categoryId.trim() : deleteField();
    }

    if (input.tags !== undefined) {
      updatePayload.tags = normalizeDesignTags(input.tags);
    }

    if (input.status !== undefined) {
      validateWritableDesignStatus(input.status);
      updatePayload.status = input.status;
    }

    if (input.originalPath !== undefined) {
      updatePayload.originalPath = validateOptionalOriginalPath(input.originalPath, designId);
    }

    if (input.thumbnailPath !== undefined) {
      updatePayload.thumbnailPath =
        validateOptionalDerivativePath(input.thumbnailPath, "thumbnails", designId) ?? "";
    }

    if (input.previewPath !== undefined) {
      const previewPath = validateOptionalDerivativePath(input.previewPath, "previews", designId);
      updatePayload.previewPath = previewPath ?? deleteField();
    }

    if (input.width !== undefined) {
      updatePayload.width = input.width;
    }

    if (input.height !== undefined) {
      updatePayload.height = input.height;
    }

    if (input.dpi !== undefined) {
      updatePayload.dpi = input.dpi;
    }

    if (input.requestedByCustomerId !== undefined) {
      updatePayload.requestedByCustomerId = input.requestedByCustomerId.trim()
        ? input.requestedByCustomerId.trim()
        : deleteField();
    }

    try {
      const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);
      const existingSnapshot = await getDoc(designRef);

      if (!existingSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      const existingData = existingSnapshot.data();

      const staffPrintSizeInput = validateStaffPrintSizeUpdate(existingData, input);

      if (staffPrintSizeInput) {
        const printSizeFields = buildStaffPrintSizePersistenceFields(staffPrintSizeInput);

        if ("error" in printSizeFields) {
          throw new Error(printSizeFields.error);
        }

        updatePayload.printWidthInches = printSizeFields.printWidthInches;
        updatePayload.printHeightInches = printSizeFields.printHeightInches;
        updatePayload.printAspectRatioLocked = printSizeFields.printAspectRatioLocked;
        updatePayload.effectiveDpi = printSizeFields.effectiveDpi;
        updatePayload.printSizeSource = printSizeFields.printSizeSource;
      }

      if (input.status !== undefined) {
        const existingStatus = existingData.status;

        if (typeof existingStatus === "string" && isDesignStatus(existingStatus)) {
          if (input.status === "archived") {
            throw new Error("Use archiveDesign to archive a design.");
          }

          if (existingStatus === "archived") {
            throw new Error("Use restoreDesign to restore an archived design.");
          }
        }
      }

      if (typeof existingData.createdBy !== "string") {
        updatePayload.createdBy =
          typeof existingData.uploadedBy === "string" ? existingData.uploadedBy : caller.id;
      }

      assertNoUndefinedFirestoreFields(updatePayload, "Design update payload");
      await updateDoc(designRef, updatePayload);
      const updatedSnapshot = await getDoc(designRef);

      if (!updatedSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      return mapDesignDocument(updatedSnapshot.id, updatedSnapshot.data());
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to update the design. Please try again."));
    }
  },

  /**
   * Persists AI review state only. Call through `designAiReviewService`.
   * Does not transition operational `status`.
   */
  async applyAiReviewUpdate(
    caller: User,
    designId: string,
    input: AiReviewStateUpdate,
  ): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to edit designs.");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: caller.id,
      aiReviewStatus: input.aiReviewStatus,
      aiReviewed: input.aiReviewed,
      aiProcessed: input.aiProcessed,
    };

    if (input.clearReviewedAt) {
      updatePayload.aiReviewedAt = deleteField();
    } else if (input.aiReviewStatus !== "pending") {
      updatePayload.aiReviewedAt = serverTimestamp();
    }

    if (input.clearReviewedBy) {
      updatePayload.aiReviewedBy = deleteField();
    } else if (input.aiReviewedBy !== undefined) {
      updatePayload.aiReviewedBy = input.aiReviewedBy;
    }

    if (input.aiReviewVersion !== undefined) {
      updatePayload.aiReviewVersion = input.aiReviewVersion ? input.aiReviewVersion : deleteField();
    }

    if (input.aiReviewNotes !== undefined) {
      updatePayload.aiReviewNotes = input.aiReviewNotes ? input.aiReviewNotes : deleteField();
    }

    if (input.clearReviewConfidence) {
      updatePayload.aiReviewConfidence = deleteField();
    } else if (input.aiReviewConfidence !== undefined) {
      updatePayload.aiReviewConfidence = input.aiReviewConfidence;
    }

    try {
      const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);
      const existingSnapshot = await getDoc(designRef);

      if (!existingSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      const existingData = existingSnapshot.data();

      if (existingData.status === "archived") {
        throw new Error("Archived designs cannot be updated for AI review.");
      }

      if (typeof existingData.createdBy !== "string") {
        updatePayload.createdBy =
          typeof existingData.uploadedBy === "string" ? existingData.uploadedBy : caller.id;
      }

      assertNoUndefinedFirestoreFields(updatePayload, "Design AI review update payload");
      await updateDoc(designRef, updatePayload);
      const updatedSnapshot = await getDoc(designRef);

      if (!updatedSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      return mapDesignDocument(updatedSnapshot.id, updatedSnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Archived designs")) {
        throw error;
      }

      throw new Error(
        getFirestoreErrorMessage(error, "Unable to update AI review state. Please try again."),
      );
    }
  },

  /**
   * Persists coordinated catalog approval or rejection.
   * Call through `catalogApprovalService` only.
   */
  async applyCatalogApprovalUpdate(
    caller: User,
    designId: string,
    input: CatalogApprovalUpdate,
  ): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to edit designs.");
    }

    validateWritableDesignStatus(input.status);

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: caller.id,
      status: input.status,
      aiReviewStatus: input.aiReviewStatus,
      aiReviewed: input.aiReviewed,
      aiProcessed: input.aiProcessed,
      aiReviewedAt: serverTimestamp(),
      aiReviewedBy: input.aiReviewedBy,
    };

    if (input.aiReviewVersion !== undefined) {
      updatePayload.aiReviewVersion = input.aiReviewVersion ? input.aiReviewVersion : deleteField();
    }

    if (input.aiReviewNotes !== undefined) {
      updatePayload.aiReviewNotes = input.aiReviewNotes ? input.aiReviewNotes : deleteField();
    }

    if (input.aiReviewConfidence !== undefined) {
      updatePayload.aiReviewConfidence = input.aiReviewConfidence;
    }

    try {
      const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);
      const existingSnapshot = await getDoc(designRef);

      if (!existingSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      const existingData = existingSnapshot.data();

      if (existingData.status === "archived") {
        throw new Error("Archived designs cannot be approved or rejected.");
      }

      if (typeof existingData.createdBy !== "string") {
        updatePayload.createdBy =
          typeof existingData.uploadedBy === "string" ? existingData.uploadedBy : caller.id;
      }

      assertNoUndefinedFirestoreFields(updatePayload, "Design catalog approval update payload");
      await updateDoc(designRef, updatePayload);
      const updatedSnapshot = await getDoc(designRef);

      if (!updatedSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      return mapDesignDocument(updatedSnapshot.id, updatedSnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Archived designs")) {
        throw error;
      }

      throw new Error(
        getFirestoreErrorMessage(error, "Unable to update catalog approval. Please try again."),
      );
    }
  },

  async archiveDesign(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canArchiveDesigns(caller)) {
      throw new Error("You do not have permission to archive designs.");
    }

    const design = await this.getDesignById(caller, designId);

    if (design.status === "archived") {
      throw new Error("This design is already archived.");
    }

    if (!isOperationalDesignStatus(design.status)) {
      throw new Error("The design status cannot be archived.");
    }

    try {
      const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);
      const updatePayload = {
        status: "archived",
        previousStatus: design.status,
        archivedAt: serverTimestamp(),
        archivedBy: caller.id,
        updatedAt: serverTimestamp(),
        updatedBy: caller.id,
      };

      assertNoUndefinedFirestoreFields(updatePayload, "Design archive payload");
      await updateDoc(designRef, updatePayload);

      const updatedSnapshot = await getDoc(designRef);

      if (!updatedSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      return mapDesignDocument(updatedSnapshot.id, updatedSnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("This design")) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to archive the design. Please try again."));
    }
  },

  async restoreDesign(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to restore designs.");
    }

    const design = await this.getDesignById(caller, designId);

    if (design.status !== "archived") {
      throw new Error("Only archived designs can be restored.");
    }

    const restoreStatus = resolveRestoreStatus({
      aiReviewed: design.aiReviewed,
      aiReviewStatus: design.aiReviewStatus,
      previousStatus: design.previousStatus,
    });

    try {
      const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);
      const updatePayload = {
        status: restoreStatus,
        previousStatus: deleteField(),
        archivedAt: deleteField(),
        archivedBy: deleteField(),
        updatedAt: serverTimestamp(),
        updatedBy: caller.id,
      };

      assertNoUndefinedFirestoreFields(updatePayload, "Design restore payload");
      await updateDoc(designRef, updatePayload);

      const updatedSnapshot = await getDoc(designRef);

      if (!updatedSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      return mapDesignDocument(updatedSnapshot.id, updatedSnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Only archived")) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to restore the design. Please try again."));
    }
  },
};
