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
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "../../firebase/utils/firestoreErrorMessage";
import {
  mapFirestoreTimestamp,
  resolveDesignDocumentTimestamps,
} from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import { isCanonicalDesignStoragePath } from "../constants/designStoragePaths";
import type { CreateDesignInput, Design, UpdateDesignInput } from "../types/design.types";
import type { AiReviewStateUpdate, CatalogApprovalUpdate } from "../types/aiReview.types";
import { isAiReviewStatus } from "../types/aiReview.types";
import type { DesignListPage, DesignListQuery, DesignListSortField } from "../types/designQuery.types";
import { isDesignStatus, isWritableDesignStatus } from "../types/designStatus.types";
import { normalizeDesignTags } from "../utils/designTagNormalizer";
import { mergeDesignDocumentDataAfterWrite } from "../utils/designDocumentAfterWrite";
import { mapDesignAiFields } from "../utils/designAiFieldsMapper";
import { isOperationalDesignStatus, resolveRestoreStatus } from "../utils/designArchiveRestore";

const DEFAULT_LIST_LIMIT = 100;
export const DESIGN_LIST_PAGE_SIZE = DEFAULT_LIST_LIMIT;
const MAX_TITLE_LENGTH = 200;

function shouldApplyServerAiReviewFilter(listQuery: DesignListQuery): boolean {
  return (
    listQuery.aiReviewStatus !== undefined &&
    listQuery.aiReviewStatus !== "pending"
  );
}

function getDesignSortMillis(design: Design, sortField: DesignListSortField): number {
  return sortField === "createdAt" ? design.createdAt.toMillis() : design.updatedAt.toMillis();
}

function buildDesignListConstraints(listQuery: DesignListQuery = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  const pageSize = listQuery.limitCount ?? DEFAULT_LIST_LIMIT;
  const sortField = listQuery.sortField ?? "updatedAt";
  const sortDirection = listQuery.sortDirection ?? "desc";

  // Field order matches composite indexes in firestore.indexes.json:
  // categoryId → tags (array-contains) → status → aiReviewStatus → orderBy
  if (listQuery.categoryId) {
    constraints.push(where("categoryId", "==", listQuery.categoryId));
  }

  if (listQuery.tag) {
    constraints.push(where("tags", "array-contains", listQuery.tag.trim().toLowerCase()));
  }

  if (listQuery.statusIn && listQuery.statusIn.length > 0) {
    if (listQuery.statusIn.length === 1) {
      constraints.push(where("status", "==", listQuery.statusIn[0]));
    } else {
      constraints.push(where("status", "in", [...listQuery.statusIn]));
    }
  } else if (listQuery.status) {
    constraints.push(where("status", "==", listQuery.status));
  }

  if (shouldApplyServerAiReviewFilter(listQuery)) {
    constraints.push(where("aiReviewStatus", "==", listQuery.aiReviewStatus));
  }

  constraints.push(orderBy(sortField, sortDirection));
  constraints.push(orderBy("__name__", sortDirection));

  if (listQuery.cursor) {
    constraints.push(
      startAfter(Timestamp.fromMillis(listQuery.cursor.sortMillis), listQuery.cursor.designId),
    );
  }

  constraints.push(limit(pageSize + 1));

  return constraints;
}

function buildDesignListPage(
  designs: Design[],
  pageSize: number,
  sortField: DesignListSortField = "updatedAt",
): DesignListPage {
  const hasMore = designs.length > pageSize;
  const pageDesigns = hasMore ? designs.slice(0, pageSize) : designs;
  const lastDesign = pageDesigns.at(-1);

  return {
    designs: pageDesigns,
    hasMore,
    nextCursor:
      hasMore && lastDesign
        ? {
            designId: lastDesign.id,
            sortMillis: getDesignSortMillis(lastDesign, sortField),
          }
        : undefined,
  };
}

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
  aiProcessingStage?: unknown;
  aiSuggestions?: unknown;
  aiAnalysis?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  previousStatus?: unknown;
  archivedAt?: unknown;
  archivedBy?: unknown;
}

function mapDesignDocument(designId: string, data: DesignDocumentData): Design {
  const timestamps = resolveDesignDocumentTimestamps(data);
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  if (
    typeof data.title !== "string" ||
    !isDesignStatus(data.status) ||
    typeof data.originalPath !== "string" ||
    typeof data.thumbnailPath !== "string" ||
    typeof data.uploadedBy !== "string" ||
    !timestamps
  ) {
    throw new Error("A design record is incomplete.");
  }

  const aiProcessed = typeof data.aiProcessed === "boolean" ? data.aiProcessed : false;
  const aiReviewed = typeof data.aiReviewed === "boolean" ? data.aiReviewed : false;
  const queueCount = typeof data.queueCount === "number" ? data.queueCount : 0;

  return {
    id: designId,
    title: data.title,
    description: typeof data.description === "string" ? data.description : undefined,
    categoryId: typeof data.categoryId === "string" ? data.categoryId : undefined,
    tags,
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
    queueCount,
    aiProcessed,
    aiReviewed,
    aiReviewStatus:
      typeof data.aiReviewStatus === "string" && isAiReviewStatus(data.aiReviewStatus)
        ? data.aiReviewStatus
        : undefined,
    aiReviewedAt: mapFirestoreTimestamp(data.aiReviewedAt),
    aiReviewedBy: typeof data.aiReviewedBy === "string" ? data.aiReviewedBy : undefined,
    aiReviewVersion: typeof data.aiReviewVersion === "string" ? data.aiReviewVersion : undefined,
    aiReviewNotes: typeof data.aiReviewNotes === "string" ? data.aiReviewNotes : undefined,
    aiReviewConfidence:
      typeof data.aiReviewConfidence === "number" ? data.aiReviewConfidence : undefined,
    ...mapDesignAiFields(data as Record<string, unknown>),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : data.uploadedBy,
    updatedBy:
      typeof data.updatedBy === "string"
        ? data.updatedBy
        : typeof data.createdBy === "string"
          ? data.createdBy
          : data.uploadedBy,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    previousStatus:
      typeof data.previousStatus === "string" &&
      isDesignStatus(data.previousStatus) &&
      isOperationalDesignStatus(data.previousStatus)
        ? data.previousStatus
        : undefined,
    archivedAt: mapFirestoreTimestamp(data.archivedAt),
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

function shouldSplitStatusQueries(listQuery: DesignListQuery): boolean {
  return Boolean(
    listQuery.tag?.trim() && listQuery.statusIn && listQuery.statusIn.length > 1,
  );
}

function isFirestoreIndexError(error: unknown): boolean {
  return error instanceof Error && /index/i.test(error.message);
}

function filterDesignsByTag(designs: Design[], tag: string): Design[] {
  const normalizedTag = tag.trim().toLowerCase();

  return designs.filter((design) => design.tags.includes(normalizedTag));
}

function mergeDesignListPages(
  pages: DesignListPage[],
  pageSize: number,
  sortField: DesignListSortField = "updatedAt",
): DesignListPage {
  const merged = new Map<string, Design>();

  for (const page of pages) {
    for (const design of page.designs) {
      merged.set(design.id, design);
    }
  }

  const sortedDesigns = [...merged.values()].sort((leftDesign, rightDesign) => {
    const timeDifference = rightDesign.updatedAt.toMillis() - leftDesign.updatedAt.toMillis();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return rightDesign.id.localeCompare(leftDesign.id);
  });

  return buildDesignListPage(sortedDesigns, pageSize, sortField);
}

const TAG_FILTER_FALLBACK_LIMIT = 500;

async function fetchDesignListPage(
  _caller: User,
  listQuery: DesignListQuery,
): Promise<DesignListPage> {
  const pageSize = listQuery.limitCount ?? DEFAULT_LIST_LIMIT;
  const designsQuery = query(
    firestoreCollectionService.getDesignsCollection(),
    ...buildDesignListConstraints(listQuery),
  );
  const snapshot = await getDocs(designsQuery);
  const designs = snapshot.docs.flatMap((designDocument) => {
    try {
      return [mapDesignDocument(designDocument.id, designDocument.data())];
    } catch (error) {
      console.warn(
        `[designService] Skipping incomplete design ${designDocument.id}:`,
        error instanceof Error ? error.message : error,
      );
      return [];
    }
  });

  return buildDesignListPage(designs, pageSize, listQuery.sortField ?? "updatedAt");
}

export const designService = {
  generateDesignId(): string {
    return doc(firestoreCollectionService.getDesignsCollection()).id;
  },

  mapFirestoreDesign(designId: string, data: unknown): Design {
    return mapDesignDocument(designId, data as DesignDocumentData);
  },

  async listDesignsPage(caller: User, listQuery: DesignListQuery = {}): Promise<DesignListPage> {
    if (!permissionService.canViewDesigns(caller)) {
      return { designs: [], hasMore: false };
    }

    const pageSize = listQuery.limitCount ?? DEFAULT_LIST_LIMIT;

    try {
      if (shouldSplitStatusQueries(listQuery)) {
        const statuses = listQuery.statusIn ?? [];
        const pages = await Promise.all(
          statuses.map((status) =>
            fetchDesignListPage(caller, {
              ...listQuery,
              status,
              statusIn: undefined,
              cursor: undefined,
            }),
          ),
        );

        return mergeDesignListPages(pages, pageSize, listQuery.sortField ?? "updatedAt");
      }

      return await fetchDesignListPage(caller, listQuery);
    } catch (error) {
      if (listQuery.tag?.trim() && isFirestoreIndexError(error)) {
        const fallbackPage = await fetchDesignListPage(caller, {
          ...listQuery,
          tag: undefined,
          limitCount: TAG_FILTER_FALLBACK_LIMIT,
          cursor: undefined,
        });

        let filteredDesigns = filterDesignsByTag(fallbackPage.designs, listQuery.tag);

        if (listQuery.statusIn && listQuery.statusIn.length > 0) {
          const allowedStatuses = new Set(listQuery.statusIn);
          filteredDesigns = filteredDesigns.filter((design) =>
            allowedStatuses.has(design.status),
          );
        } else if (listQuery.status) {
          filteredDesigns = filteredDesigns.filter((design) => design.status === listQuery.status);
        }

        return buildDesignListPage(filteredDesigns, pageSize, listQuery.sortField ?? "updatedAt");
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to load designs. Please try again."));
    }
  },

  async listDesigns(caller: User, listQuery: DesignListQuery = {}): Promise<Design[]> {
    const page = await this.listDesignsPage(caller, listQuery);
    return page.designs;
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

  async updateDesign(
    caller: User,
    designId: string,
    input: UpdateDesignInput,
    options?: { allowStatusChange?: boolean },
  ): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to edit designs.");
    }

    if (Object.keys(input).length === 0) {
      throw new Error("No design changes were provided.");
    }

    if (input.status !== undefined && !options?.allowStatusChange) {
      throw new Error("Design status cannot be changed through metadata updates.");
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

      return mapDesignDocument(
        designId,
        mergeDesignDocumentDataAfterWrite(
          existingData as Record<string, unknown>,
          updatePayload,
          caller.id,
        ) as DesignDocumentData,
      );
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

      return mapDesignDocument(
        designId,
        mergeDesignDocumentDataAfterWrite(
          existingData as Record<string, unknown>,
          updatePayload,
          caller.id,
        ) as DesignDocumentData,
      );
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

      return mapDesignDocument(
        designId,
        mergeDesignDocumentDataAfterWrite(
          existingData as Record<string, unknown>,
          updatePayload,
          caller.id,
        ) as DesignDocumentData,
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Archived designs")) {
        throw error;
      }

      throw new Error(
        getFirestoreErrorMessage(error, "Unable to update catalog approval. Please try again."),
      );
    }
  },

  /**
   * Returns a rejected design to Needs Review without re-running AI.
   */
  async applyReopenFromRejectedUpdate(
    caller: User,
    designId: string,
    input: Pick<AiReviewStateUpdate, "aiReviewStatus" | "aiReviewed" | "aiProcessed" | "aiReviewedBy">,
  ): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to edit designs.");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: caller.id,
      status: "imported",
      aiReviewStatus: input.aiReviewStatus,
      aiReviewed: input.aiReviewed,
      aiProcessed: input.aiProcessed,
      aiReviewedBy: input.aiReviewedBy,
      aiReviewedAt: deleteField(),
    };

    try {
      const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);
      const existingSnapshot = await getDoc(designRef);

      if (!existingSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      const existingData = existingSnapshot.data();

      if (existingData.status !== "rejected") {
        throw new Error("Only rejected designs can be reopened for review.");
      }

      if (existingData.status === "archived") {
        throw new Error("Archived designs cannot be reopened for review.");
      }

      if (typeof existingData.createdBy !== "string") {
        updatePayload.createdBy =
          typeof existingData.uploadedBy === "string" ? existingData.uploadedBy : caller.id;
      }

      assertNoUndefinedFirestoreFields(updatePayload, "Design reopen update payload");
      await updateDoc(designRef, updatePayload);

      const merged = mergeDesignDocumentDataAfterWrite(
        existingData as Record<string, unknown>,
        {
          ...updatePayload,
          aiReviewedAt: undefined,
        },
        caller.id,
      );

      delete merged.aiReviewedAt;

      return mapDesignDocument(designId, merged as DesignDocumentData);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith("Only rejected") ||
          error.message.startsWith("Archived designs") ||
          error.message === "The design record was not found.")
      ) {
        throw error;
      }

      throw new Error(
        getFirestoreErrorMessage(error, "Unable to reopen the design for review. Please try again."),
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
