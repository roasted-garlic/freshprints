import {
  deleteField,
  doc,
  getCountFromServer,
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

import {
  runTracedWrite,
  traceFirestoreCacheEvent,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  traceFirestoreWriteComplete,
  traceFirestoreWriteStart,
  type FirestoreTraceMetadata,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";
import { createBoundedAsyncCache } from "@fresh-prints/shared/utils/boundedAsyncCache";

import { getFirestoreErrorMessage } from "../../firebase/utils/firestoreErrorMessage";
import {
  mapFirestoreTimestamp,
  resolveDesignDocumentTimestamps,
} from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import {
  isDefaultArtworkBackgroundHex,
  normalizeArtworkBackgroundHex,
} from "@fresh-prints/shared/constants/design/artworkBackground.constants";
import { parseArtworkPlacement } from "@fresh-prints/shared/constants/design/artworkPlacement.constants";
import {
  isArtworkBackgroundSource,
  isHalftoneDecisionSource,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import { isCanonicalDesignStoragePath } from "../constants/designStoragePaths";
import type { CreateDesignInput, Design, DesignAuthoritySnapshot, UpdateDesignInput } from "../types/design.types";
import type { AiReviewStateUpdate, CatalogApprovalUpdate } from "../types/aiReview.types";
import { isAiReviewStatus } from "../types/aiReview.types";
import type { DesignListPage, DesignListQuery, DesignListSortDirection, DesignListSortField } from "../types/designQuery.types";
import { isDesignStatus, isWritableDesignStatus } from "../types/designStatus.types";
import { normalizeDesignTags } from "../utils/designTagNormalizer";
import { mergeDesignDocumentDataAfterWrite } from "../utils/designDocumentAfterWrite";
import { mapDesignAiFields } from "../utils/designAiFieldsMapper";
import { isOperationalDesignStatus, resolveRestoreStatus } from "../utils/designArchiveRestore";
import { sortDesignsForListQuery } from "../utils/sortDesignsForListQuery";
import { buildDesignListPageHasMore } from "../utils/designListPageHasMore";
import { getDesignListQueryCacheKey } from "../utils/designListQueryIdentity";

const DEFAULT_LIST_LIMIT = 100;
export const DESIGN_LIST_PAGE_SIZE = DEFAULT_LIST_LIMIT;
const MAX_TITLE_LENGTH = 200;
const designPageCache = createBoundedAsyncCache<DesignListPage>({
  maxEntries: 64,
  onEvent: (event) => traceFirestoreCacheEvent(
    event === "hit" ? "cacheHit" : event === "retry" ? "retry" : "cacheMiss",
    {
      app: "studio",
      collection: "designs",
      source: "designService.pageCache",
      triggerReason: "route",
    },
  ),
  ttlMs: 15 * 1000,
});
const designCountCache = createBoundedAsyncCache<number>({
  maxEntries: 16,
  onEvent: (event) => traceFirestoreCacheEvent(
    event === "hit" ? "cacheHit" : event === "retry" ? "retry" : "cacheMiss",
    {
      app: "studio",
      collection: "designs",
      source: "designService.countCache",
      triggerReason: "route",
    },
  ),
  ttlMs: 15 * 1000,
});
const designDocumentCache = createBoundedAsyncCache<Design>({
  maxEntries: 256,
  onEvent: (event) => traceFirestoreCacheEvent(
    event === "hit" ? "cacheHit" : event === "retry" ? "retry" : "cacheMiss",
    {
      app: "studio",
      collection: "designs",
      documentPathPattern: "designs/{designId}",
      source: "designService.documentCache",
      triggerReason: "route",
    },
  ),
  ttlMs: 15 * 1000,
});

function getDesignQueryCacheKey(listQuery: DesignListQuery = {}): string {
  return getDesignListQueryCacheKey(listQuery, { defaultLimitCount: DEFAULT_LIST_LIMIT });
}

function invalidateDesignReadCaches(designId?: string): void {
  designPageCache.clear();
  designCountCache.clear();
  if (designId) {
    designDocumentCache.invalidate(designId);
  } else {
    designDocumentCache.clear();
  }
}

function shouldApplyServerAiReviewFilter(listQuery: DesignListQuery): boolean {
  return listQuery.aiReviewStatus !== undefined;
}

function getDesignSortMillis(design: Design, sortField: DesignListSortField): number {
  if (sortField === "readyAt") {
    // Must mirror the value Firestore ordered by so the next-page cursor lands correctly. After
    // the dev backfill every ready design carries `readyAt`; the `createdAt` fallback only covers
    // a not-yet-backfilled document (Owner QA Amendment 3 correction).
    return (design.readyAt ?? design.createdAt).toMillis();
  }

  return sortField === "createdAt" ? design.createdAt.toMillis() : design.updatedAt.toMillis();
}

function buildDesignFilterConstraints(listQuery: DesignListQuery = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

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

  if (listQuery.companionSetIncomplete === true) {
    constraints.push(where("companionSetIncomplete", "==", true));
  }

  return constraints;
}

function buildDesignListConstraints(listQuery: DesignListQuery = {}): QueryConstraint[] {
  const constraints = buildDesignFilterConstraints(listQuery);
  const pageSize = listQuery.limitCount ?? DEFAULT_LIST_LIMIT;
  const sortField = listQuery.sortField ?? "updatedAt";
  const sortDirection = listQuery.sortDirection ?? "desc";

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
  const hasMore = buildDesignListPageHasMore(designs.length, pageSize);
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
  artworkBackgroundHex?: unknown;
  artworkBackgroundSource?: unknown;
  artworkPlacement?: unknown;
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
  sourceCustomerUploadId?: unknown;
  wasUpscaled?: unknown;
  upscaleFactor?: unknown;
  upscalePassCount?: unknown;
  nativeProductionWidthPx?: unknown;
  nativeProductionHeightPx?: unknown;
  interactiveEnhancedOriginalPath?: unknown;
  interactiveEnhancedWidthPx?: unknown;
  interactiveEnhancedHeightPx?: unknown;
  interactiveEnhanceGeneratedAt?: unknown;
  approvedMaxPrintWidthInches?: unknown;
  approvedMaxPrintHeightInches?: unknown;
  sizingPolicyVersion?: unknown;
  sizingWarningCode?: unknown;
  halftoneDetection?: unknown;
  halftoneSubmitterResponse?: unknown;
  halftoneStaffDecision?: unknown;
  halftoneDecisionSource?: unknown;
  companionSetId?: unknown;
  companionDesignIds?: unknown;
  companionSetIncomplete?: unknown;
  isExplicitContent?: unknown;
  explicitContentSource?: unknown;
  explicitContentAutomationLocked?: unknown;
  censoredTerms?: unknown;
  uploadedBy?: unknown;
  requestedByCustomerId?: unknown;
  queueCount?: unknown;
  readyAt?: unknown;
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
  smartProfile?: unknown;
  smartProfileAiSnapshot?: unknown;
  smartProfileImportPresets?: unknown;
  importBatchId?: unknown;
  importSourceFileName?: unknown;
  importRelativePath?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  previousStatus?: unknown;
  archivedAt?: unknown;
  archivedBy?: unknown;
  assetsPurgedAt?: unknown;
  assetsPurgedBy?: unknown;
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
    artworkBackgroundHex:
      typeof data.artworkBackgroundHex === "string" ? data.artworkBackgroundHex : undefined,
    artworkBackgroundSource: isArtworkBackgroundSource(data.artworkBackgroundSource)
      ? data.artworkBackgroundSource
      : undefined,
    artworkPlacement: parseArtworkPlacement(data.artworkPlacement),
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
    sourceCustomerUploadId:
      typeof data.sourceCustomerUploadId === "string" ? data.sourceCustomerUploadId : undefined,
    wasUpscaled: typeof data.wasUpscaled === "boolean" ? data.wasUpscaled : undefined,
    upscaleFactor: typeof data.upscaleFactor === "number" ? data.upscaleFactor : undefined,
    upscalePassCount:
      data.upscalePassCount === 0 || data.upscalePassCount === 1 || data.upscalePassCount === 2
        ? data.upscalePassCount
        : undefined,
    nativeProductionWidthPx:
      typeof data.nativeProductionWidthPx === "number" ? data.nativeProductionWidthPx : undefined,
    nativeProductionHeightPx:
      typeof data.nativeProductionHeightPx === "number" ? data.nativeProductionHeightPx : undefined,
    interactiveEnhancedOriginalPath:
      typeof data.interactiveEnhancedOriginalPath === "string"
        ? data.interactiveEnhancedOriginalPath
        : undefined,
    interactiveEnhancedWidthPx:
      typeof data.interactiveEnhancedWidthPx === "number"
        ? data.interactiveEnhancedWidthPx
        : undefined,
    interactiveEnhancedHeightPx:
      typeof data.interactiveEnhancedHeightPx === "number"
        ? data.interactiveEnhancedHeightPx
        : undefined,
    interactiveEnhanceGeneratedAt: data.interactiveEnhanceGeneratedAt,
    approvedMaxPrintWidthInches:
      typeof data.approvedMaxPrintWidthInches === "number"
        ? data.approvedMaxPrintWidthInches
        : undefined,
    approvedMaxPrintHeightInches:
      typeof data.approvedMaxPrintHeightInches === "number"
        ? data.approvedMaxPrintHeightInches
        : undefined,
    sizingPolicyVersion:
      typeof data.sizingPolicyVersion === "string" ? data.sizingPolicyVersion : undefined,
    sizingWarningCode:
      typeof data.sizingWarningCode === "string" ? data.sizingWarningCode : undefined,
    halftoneDetection:
      data.halftoneDetection && typeof data.halftoneDetection === "object"
        ? (data.halftoneDetection as Design["halftoneDetection"])
        : undefined,
    halftoneSubmitterResponse:
      data.halftoneSubmitterResponse && typeof data.halftoneSubmitterResponse === "object"
        ? (data.halftoneSubmitterResponse as Design["halftoneSubmitterResponse"])
        : undefined,
    halftoneStaffDecision:
      data.halftoneStaffDecision && typeof data.halftoneStaffDecision === "object"
        ? (data.halftoneStaffDecision as Design["halftoneStaffDecision"])
        : undefined,
    halftoneDecisionSource: isHalftoneDecisionSource(data.halftoneDecisionSource)
      ? data.halftoneDecisionSource
      : undefined,
    companionSetId: typeof data.companionSetId === "string" ? data.companionSetId : undefined,
    companionDesignIds: Array.isArray(data.companionDesignIds)
      ? data.companionDesignIds.filter((id): id is string => typeof id === "string")
      : undefined,
    companionSetIncomplete:
      typeof data.companionSetIncomplete === "boolean" ? data.companionSetIncomplete : undefined,
    isExplicitContent:
      typeof data.isExplicitContent === "boolean" ? data.isExplicitContent : undefined,
    explicitContentSource:
      data.explicitContentSource === "staff" || data.explicitContentSource === "automation"
        ? data.explicitContentSource
        : undefined,
    explicitContentAutomationLocked:
      typeof data.explicitContentAutomationLocked === "boolean"
        ? data.explicitContentAutomationLocked
        : undefined,
    censoredTerms: Array.isArray(data.censoredTerms)
      ? data.censoredTerms.filter(
          (term): term is string => typeof term === "string" && term.trim().length > 0,
        )
      : undefined,
    queueCount,
    aiProcessed,
    aiReviewed,
    aiReviewStatus:
      typeof data.aiReviewStatus === "string" && isAiReviewStatus(data.aiReviewStatus)
        ? data.aiReviewStatus
        : undefined,
    readyAt: mapFirestoreTimestamp(data.readyAt),
    aiReviewedAt: mapFirestoreTimestamp(data.aiReviewedAt),
    aiReviewedBy: typeof data.aiReviewedBy === "string" ? data.aiReviewedBy : undefined,
    aiReviewVersion: typeof data.aiReviewVersion === "string" ? data.aiReviewVersion : undefined,
    aiReviewNotes: typeof data.aiReviewNotes === "string" ? data.aiReviewNotes : undefined,
    aiReviewConfidence:
      typeof data.aiReviewConfidence === "number" ? data.aiReviewConfidence : undefined,
    ...mapDesignAiFields(data as Record<string, unknown>),
    smartProfile:
      data.smartProfile && typeof data.smartProfile === "object"
        ? (data.smartProfile as Design["smartProfile"])
        : undefined,
    smartProfileAiSnapshot:
      data.smartProfileAiSnapshot && typeof data.smartProfileAiSnapshot === "object"
        ? (data.smartProfileAiSnapshot as Design["smartProfileAiSnapshot"])
        : undefined,
    smartProfileImportPresets:
      data.smartProfileImportPresets && typeof data.smartProfileImportPresets === "object"
        ? (data.smartProfileImportPresets as Design["smartProfileImportPresets"])
        : undefined,
    importBatchId: typeof data.importBatchId === "string" ? data.importBatchId : undefined,
    importSourceFileName:
      typeof data.importSourceFileName === "string" ? data.importSourceFileName : undefined,
    importRelativePath:
      typeof data.importRelativePath === "string" ? data.importRelativePath : undefined,
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
    assetsPurgedAt: mapFirestoreTimestamp(data.assetsPurgedAt),
    assetsPurgedBy: typeof data.assetsPurgedBy === "string" ? data.assetsPurgedBy : undefined,
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

function designListTraceMetadata(
  listQuery: DesignListQuery,
  source: string,
): FirestoreTraceMetadata {
  const constraints = [
    listQuery.status ? `status==${listQuery.status}` : "",
    listQuery.statusIn?.length ? `status in ${[...listQuery.statusIn].sort().join(",")}` : "",
    listQuery.aiReviewStatus ? `aiReviewStatus==${listQuery.aiReviewStatus}` : "",
    listQuery.categoryId ? "categoryId=={categoryId}" : "",
    listQuery.tag ? "tags array-contains {tag}" : "",
    listQuery.companionSetIncomplete === true ? "companionSetIncomplete==true" : "",
  ].filter(Boolean);
  const sortField = listQuery.sortField ?? "updatedAt";
  const sortDirection = listQuery.sortDirection ?? "desc";

  return {
    app: "studio",
    collection: "designs",
    constraints,
    limit: (listQuery.limitCount ?? DEFAULT_LIST_LIMIT) + 1,
    orderBy: [`${sortField}:${sortDirection}`, `__name__:${sortDirection}`],
    source,
    triggerReason: "route",
  };
}

function mergeDesignListPages(
  pages: DesignListPage[],
  pageSize: number,
  sortField: DesignListSortField = "updatedAt",
  sortDirection: DesignListSortDirection = "desc",
): DesignListPage {
  const merged = new Map<string, Design>();

  for (const page of pages) {
    for (const design of page.designs) {
      merged.set(design.id, design);
    }
  }

  const sortedDesigns = sortDesignsForListQuery([...merged.values()], sortField, sortDirection);

  return buildDesignListPage(sortedDesigns, pageSize, sortField);
}

const TAG_FILTER_FALLBACK_LIMIT = 500;

async function fetchDesignListPageUncached(
  _caller: User,
  listQuery: DesignListQuery,
): Promise<DesignListPage> {
  const pageSize = listQuery.limitCount ?? DEFAULT_LIST_LIMIT;
  const designsQuery = query(
    firestoreCollectionService.getDesignsCollection(),
    ...buildDesignListConstraints(listQuery),
  );
  const traceMetadata = designListTraceMetadata(
    listQuery,
    "designService.listDesignsPage",
  );
  traceFirestoreOneShotStart("getDocs", traceMetadata);
  const snapshot = await getDocs(designsQuery);
  traceFirestoreOneShotComplete("getDocs", traceMetadata, snapshot.size);
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

  const sortField = listQuery.sortField ?? "updatedAt";
  const sortDirection = listQuery.sortDirection ?? "desc";
  // Re-sort locally so paging/merge quirks cannot surface oldest-first in the UI.
  return buildDesignListPage(
    sortDesignsForListQuery(designs, sortField, sortDirection),
    pageSize,
    sortField,
  );
}

async function fetchDesignListPage(
  caller: User,
  listQuery: DesignListQuery,
): Promise<DesignListPage> {
  const page = await designPageCache.get(
    getDesignQueryCacheKey(listQuery),
    () => fetchDesignListPageUncached(caller, listQuery),
  );

  return {
    ...page,
    designs: [...page.designs],
    nextCursor: page.nextCursor ? { ...page.nextCursor } : undefined,
  };
}

export const designService = {
  generateDesignId(): string {
    return doc(firestoreCollectionService.getDesignsCollection()).id;
  },

  mapFirestoreDesign(designId: string, data: unknown): Design {
    return mapDesignDocument(designId, data as DesignDocumentData);
  },

  /**
   * Clear the Studio design page/count/document read caches. Used after an AI terminal patch so a
   * later confirmation reload cannot hit a stale 15s pending page (AI Processing monotonic
   * reconciliation repair).
   */
  invalidateReadCaches(designId?: string): void {
    invalidateDesignReadCaches(designId);
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

        return mergeDesignListPages(
          pages,
          pageSize,
          listQuery.sortField ?? "updatedAt",
          listQuery.sortDirection ?? "desc",
        );
      }

      const page = await fetchDesignListPage(caller, listQuery);

      // Backfill-completeness guard (Owner QA Amendment 3 correction). A Firestore
      // `orderBy("readyAt")` silently omits documents missing the field, so before the
      // `readyAt` backfill has run in a given environment this query would hide legacy ready
      // designs entirely. If the true matching count exceeds what the ordered query returned,
      // fall back to `createdAt` ordering for this request so nothing is ever invisible. Once
      // backfilled, the counts agree and this fallback never triggers.
      if (listQuery.sortField === "readyAt" && !listQuery.cursor && !page.hasMore) {
        const matchingCount = await this.countDesigns(caller, listQuery);

        if (matchingCount > page.designs.length) {
          return await fetchDesignListPage(caller, { ...listQuery, sortField: "createdAt" });
        }
      }

      return page;
    } catch (error) {
      if (listQuery.sortField === "readyAt" && isFirestoreIndexError(error)) {
        // The `readyAt` composite index is not deployed in this environment yet — never break
        // Design Library over it.
        return await fetchDesignListPage(caller, { ...listQuery, sortField: "createdAt" });
      }

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

        return buildDesignListPage(
          sortDesignsForListQuery(
            filteredDesigns,
            listQuery.sortField ?? "updatedAt",
            listQuery.sortDirection ?? "desc",
          ),
          pageSize,
          listQuery.sortField ?? "updatedAt",
        );
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to load designs. Please try again."));
    }
  },

  async listDesigns(caller: User, listQuery: DesignListQuery = {}): Promise<Design[]> {
    const page = await this.listDesignsPage(caller, listQuery);
    return page.designs;
  },

  /**
   * Aggregation count for the same filter shape as {@link listDesignsPage} (no document reads).
   * Used by AI Review tab badges instead of fetching a full page solely for `.length`.
   */
  async countDesigns(caller: User, listQuery: DesignListQuery = {}): Promise<number> {
    if (!permissionService.canViewDesigns(caller)) {
      return 0;
    }

    try {
      if (shouldSplitStatusQueries(listQuery)) {
        const statuses = listQuery.statusIn ?? [];
        const counts = await Promise.all(
          statuses.map((status) =>
            this.countDesigns(caller, {
              ...listQuery,
              status,
              statusIn: undefined,
            }),
          ),
        );
        return counts.reduce((sum, count) => sum + count, 0);
      }

      return await designCountCache.get(getDesignQueryCacheKey(listQuery), async () => {
        const countQuery = query(
          firestoreCollectionService.getDesignsCollection(),
          ...buildDesignFilterConstraints(listQuery),
        );
        const traceMetadata = designListTraceMetadata(
          { ...listQuery, limitCount: undefined },
          "designService.countDesigns",
        );
        traceFirestoreOneShotStart("getCountFromServer", {
          ...traceMetadata,
          limit: undefined,
          orderBy: undefined,
        });
        const snapshot = await getCountFromServer(countQuery);
        traceFirestoreOneShotComplete(
          "getCountFromServer",
          {
            ...traceMetadata,
            limit: undefined,
            orderBy: undefined,
          },
          0,
        );
        return snapshot.data().count;
      });
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to count designs. Please try again."));
    }
  },

  async getDesignById(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canViewDesigns(caller)) {
      throw new Error("You do not have permission to view designs.");
    }

    try {
      return await designDocumentCache.get(designId, async () => {
        const traceMetadata: FirestoreTraceMetadata = {
          app: "studio",
          collection: "designs",
          documentPathPattern: "designs/{designId}",
          source: "designService.getDesignById",
          triggerReason: "explicit-refresh",
        };
        traceFirestoreOneShotStart("getDoc", traceMetadata);
        const designSnapshot = await getDoc(
          doc(firestoreCollectionService.getDesignsCollection(), designId),
        );
        traceFirestoreOneShotComplete("getDoc", traceMetadata, designSnapshot.exists() ? 1 : 0);

        if (!designSnapshot.exists()) {
          throw new Error("The requested design was not found.");
        }

        return mapDesignDocument(designSnapshot.id, designSnapshot.data());
      });
    } catch (error) {
      if (error instanceof Error && error.message === "The requested design was not found.") {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to load the design. Please try again."));
    }
  },

  /**
   * Ordered batch hydrate by ID for Algolia hit lists.
   * Missing / unreadable docs are omitted (never authorize from Algolia alone).
   * Result order matches the requested ID sequence. Never scans the collection.
   */
  async getDesignsByIds(caller: User, designIds: string[]): Promise<Design[]> {
    if (!permissionService.canViewDesigns(caller)) {
      return [];
    }

    const uniqueIds = [...new Set(designIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const loaded = await Promise.all(
      uniqueIds.map(async (designId) => {
        try {
          return await this.getDesignById(caller, designId);
        } catch {
          return null;
        }
      }),
    );

    const byId = new Map(
      loaded
        .filter((design): design is Design => design !== null)
        .map((design) => [design.id, design] as const),
    );

    return uniqueIds
      .map((id) => byId.get(id))
      .filter((design): design is Design => design !== undefined);
  },

  /**
   * Authority read returning both mapped Design and raw document fields.
   * Used when a same-stack follow-up write may skip its pre-write getDoc (P1 I5).
   * Always hits Firestore (does not use the Design-only document cache).
   */
  async getDesignAuthoritySnapshot(caller: User, designId: string): Promise<DesignAuthoritySnapshot> {
    if (!permissionService.canViewDesigns(caller)) {
      throw new Error("You do not have permission to view designs.");
    }

    try {
      const traceMetadata: FirestoreTraceMetadata = {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.getDesignAuthoritySnapshot",
        triggerReason: "explicit-refresh",
      };
      traceFirestoreOneShotStart("getDoc", traceMetadata);
      const designSnapshot = await getDoc(
        doc(firestoreCollectionService.getDesignsCollection(), designId),
      );
      traceFirestoreOneShotComplete("getDoc", traceMetadata, designSnapshot.exists() ? 1 : 0);

      if (!designSnapshot.exists()) {
        throw new Error("The requested design was not found.");
      }

      const documentData = { ...(designSnapshot.data() as Record<string, unknown>) };
      return {
        design: mapDesignDocument(designSnapshot.id, designSnapshot.data()),
        documentData,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "The requested design was not found.") {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to load the design. Please try again."));
    }
  },

  async createDesign(caller: User, input: CreateDesignInput): Promise<DesignAuthoritySnapshot> {
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
      wasUpscaled: input.wasUpscaled,
      upscaleFactor: input.upscaleFactor,
      upscalePassCount: input.upscalePassCount,
      approvedMaxPrintWidthInches: input.approvedMaxPrintWidthInches,
      approvedMaxPrintHeightInches: input.approvedMaxPrintHeightInches,
      sizingPolicyVersion: input.sizingPolicyVersion,
      sizingWarningCode: input.sizingWarningCode,
      artworkBackgroundHex: (() => {
        const normalized = normalizeArtworkBackgroundHex(input.artworkBackgroundHex);
        if (!normalized || isDefaultArtworkBackgroundHex(normalized)) {
          return undefined;
        }
        return normalized;
      })(),
      artworkBackgroundSource: isArtworkBackgroundSource(input.artworkBackgroundSource)
        ? input.artworkBackgroundSource
        : undefined,
      halftoneDetection: input.halftoneDetection,
      halftoneStaffDecision: input.halftoneStaffDecision
        ? {
            value: input.halftoneStaffDecision.value,
            decidedBy: input.halftoneStaffDecision.decidedBy ?? caller.id,
            isExplicitOverride: input.halftoneStaffDecision.isExplicitOverride ?? true,
            decidedAt: serverTimestamp(),
          }
        : undefined,
      halftoneDecisionSource: isHalftoneDecisionSource(input.halftoneDecisionSource)
        ? input.halftoneDecisionSource
        : undefined,
      importBatchId: input.importBatchId?.trim() || undefined,
      importSourceFileName: input.importSourceFileName?.trim() || undefined,
      importRelativePath: input.importRelativePath?.trim() || undefined,
      smartProfileImportPresets: input.smartProfileImportPresets && Object.keys(input.smartProfileImportPresets).length > 0
        ? input.smartProfileImportPresets
        : undefined,
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
      await runTracedWrite("setDoc", () => setDoc(designRef, designRecord), {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.createDesign",
      });
      invalidateDesignReadCaches(designRef.id);
      const createReadTrace: FirestoreTraceMetadata = {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.createDesign",
        triggerReason: "explicit-refresh",
      };
      traceFirestoreOneShotStart("getDoc", createReadTrace);
      const createdSnapshot = await getDoc(designRef);
      traceFirestoreOneShotComplete("getDoc", createReadTrace, createdSnapshot.exists() ? 1 : 0);

      if (!createdSnapshot.exists()) {
        throw new Error("The design record could not be created.");
      }

      const documentData = { ...(createdSnapshot.data() as Record<string, unknown>) };
      return {
        design: mapDesignDocument(createdSnapshot.id, createdSnapshot.data()),
        documentData,
      };
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to create the design. Please try again."));
    }
  },

  async updateDesign(
    caller: User,
    designId: string,
    input: UpdateDesignInput,
    options?: {
      allowStatusChange?: boolean;
      /**
       * Same-stack raw Firestore document fields from a just-completed authority read.
       * When provided, skips the pre-write getDoc. Must not be a mapped `Design`.
       */
      knownExistingData?: Record<string, unknown>;
    },
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

    if (input.halftoneStaffDecision !== undefined) {
      updatePayload.halftoneStaffDecision = {
        value: input.halftoneStaffDecision.value,
        decidedBy: input.halftoneStaffDecision.decidedBy ?? caller.id,
        isExplicitOverride: input.halftoneStaffDecision.isExplicitOverride ?? true,
        decidedAt: serverTimestamp(),
      };
    }

    if (input.halftoneDecisionSource !== undefined) {
      if (input.halftoneDecisionSource === null) {
        updatePayload.halftoneDecisionSource = deleteField();
      } else if (isHalftoneDecisionSource(input.halftoneDecisionSource)) {
        updatePayload.halftoneDecisionSource = input.halftoneDecisionSource;
      }
    }

    // Staff Explicit edits stamp provenance only (ADR-FP-173). Lock is a separate deliberate control.
    if (input.isExplicitContent !== undefined) {
      updatePayload.isExplicitContent = input.isExplicitContent;
      updatePayload.explicitContentSource = "staff";
    }

    if (input.censoredTerms !== undefined) {
      const terms = normalizeDesignTags(input.censoredTerms);
      updatePayload.censoredTerms = terms.length > 0 ? terms : deleteField();
      updatePayload.explicitContentSource = "staff";
    }

    if (input.explicitContentAutomationLocked !== undefined) {
      updatePayload.explicitContentAutomationLocked = input.explicitContentAutomationLocked;
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

    if (input.artworkBackgroundHex !== undefined) {
      if (input.artworkBackgroundHex === null || input.artworkBackgroundHex === "") {
        updatePayload.artworkBackgroundHex = deleteField();
      } else {
        const normalized = normalizeArtworkBackgroundHex(input.artworkBackgroundHex);
        if (!normalized) {
          throw new Error("Artwork background must be a valid #RRGGBB color.");
        }
        updatePayload.artworkBackgroundHex = isDefaultArtworkBackgroundHex(normalized)
          ? deleteField()
          : normalized;
      }

      if (input.artworkBackgroundSource !== undefined) {
        if (input.artworkBackgroundSource === null) {
          updatePayload.artworkBackgroundSource = deleteField();
        } else if (isArtworkBackgroundSource(input.artworkBackgroundSource)) {
          updatePayload.artworkBackgroundSource = input.artworkBackgroundSource;
        }
      } else {
        updatePayload.artworkBackgroundSource = "staff_manual";
      }
    } else if (input.artworkBackgroundSource !== undefined) {
      if (input.artworkBackgroundSource === null) {
        updatePayload.artworkBackgroundSource = deleteField();
      } else if (isArtworkBackgroundSource(input.artworkBackgroundSource)) {
        updatePayload.artworkBackgroundSource = input.artworkBackgroundSource;
      }
    }

    if (input.artworkPlacement !== undefined) {
      if (input.artworkPlacement === null) {
        updatePayload.artworkPlacement = deleteField();
      } else {
        const parsed = parseArtworkPlacement(input.artworkPlacement);
        if (!parsed) {
          throw new Error("Placement must be a supported artwork placement value.");
        }
        updatePayload.artworkPlacement = parsed;
      }
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
      let existingData: Record<string, unknown>;

      if (options?.knownExistingData) {
        existingData = options.knownExistingData;
      } else {
        const updateReadTrace: FirestoreTraceMetadata = {
          app: "studio",
          collection: "designs",
          documentPathPattern: "designs/{designId}",
          source: "designService.updateDesign",
          triggerReason: "explicit-refresh",
        };
        traceFirestoreOneShotStart("getDoc", updateReadTrace);
        const existingSnapshot = await getDoc(designRef);
        traceFirestoreOneShotComplete("getDoc", updateReadTrace, existingSnapshot.exists() ? 1 : 0);

        if (!existingSnapshot.exists()) {
          throw new Error("The design record was not found.");
        }

        existingData = existingSnapshot.data() as Record<string, unknown>;
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
      const writeTraceMetadata: FirestoreTraceMetadata = {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.updateDesign",
        triggerReason: "explicit-refresh",
      };
      traceFirestoreWriteStart("updateDoc", writeTraceMetadata);
      await updateDoc(designRef, updatePayload);
      traceFirestoreWriteComplete("updateDoc", writeTraceMetadata, { writeCount: 1 });
      invalidateDesignReadCaches(designId);

      return mapDesignDocument(
        designId,
        mergeDesignDocumentDataAfterWrite(
          existingData,
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
      await runTracedWrite("updateDoc", () => updateDoc(designRef, updatePayload), {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.applyAiReviewUpdate",
      });
      invalidateDesignReadCaches(designId);

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
      const applyReadTrace: FirestoreTraceMetadata = {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.applyCatalogApprovalUpdate",
        triggerReason: "explicit-refresh",
      };
      traceFirestoreOneShotStart("getDoc", applyReadTrace);
      const existingSnapshot = await getDoc(designRef);
      traceFirestoreOneShotComplete("getDoc", applyReadTrace, existingSnapshot.exists() ? 1 : 0);

      if (!existingSnapshot.exists()) {
        throw new Error("The design record was not found.");
      }

      const existingData = existingSnapshot.data();

      if (existingData.status === "archived") {
        throw new Error("Archived designs cannot be approved or rejected.");
      }

      // Amendment 3 + owner Ready→AI reprocess: stamp readyAt only on first transition into Ready.
      // If readyAt already exists (retained through owner "Reprocess with AI" demotion), preserve it
      // so Design Library / Portal chronology is not distorted on re-approval.
      if (input.status === "ready" && existingData.readyAt == null) {
        updatePayload.readyAt = serverTimestamp();
      }

      if (typeof existingData.createdBy !== "string") {
        updatePayload.createdBy =
          typeof existingData.uploadedBy === "string" ? existingData.uploadedBy : caller.id;
      }

      assertNoUndefinedFirestoreFields(updatePayload, "Design catalog approval update payload");
      await runTracedWrite("updateDoc", () => updateDoc(designRef, updatePayload), {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.applyCatalogApprovalUpdate",
      });
      invalidateDesignReadCaches(designId);


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
      await runTracedWrite("updateDoc", () => updateDoc(designRef, updatePayload), {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.applyReopenFromRejectedUpdate",
      });
      invalidateDesignReadCaches(designId);

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
      await runTracedWrite("updateDoc", () => updateDoc(designRef, updatePayload), {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.archiveDesign",
      });
      invalidateDesignReadCaches(designId);

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
    if (!permissionService.canRestoreDesigns(caller)) {
      throw new Error("You do not have permission to restore designs.");
    }

    const design = await this.getDesignById(caller, designId);

    if (design.status !== "archived") {
      throw new Error("Only archived designs can be restored.");
    }

    if (design.assetsPurgedAt) {
      throw new Error(
        "This design’s large images were deleted. It cannot be restored to the catalog.",
      );
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
      await runTracedWrite("updateDoc", () => updateDoc(designRef, updatePayload), {
        app: "studio",
        collection: "designs",
        documentPathPattern: "designs/{designId}",
        source: "designService.restoreDesign",
      });
      invalidateDesignReadCaches(designId);

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
