import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDocs,
  onSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import { ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK } from "@fresh-prints/shared/constants/design/artworkBackground.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";
import {
  normalizeCustomerUploadPermissionActivity,
  resolveCustomerUploadPermissionAskCount,
} from "@fresh-prints/shared/utils/customerUploadPermissionFollowUp";
import { resolveIntakeHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { customerService } from "../../customers/services/customerService";
import { permissionService } from "../../permissions/services/permissionService";
import { enqueueImportedDesignsForBackgroundAi } from "../../imports/services/importAiBackgroundQueue";
import {
  customerUploadIntakeService,
  type CustomerUploadIntakeFilter,
  type CustomerUploadIntakeRow,
} from "../services/customerUploadIntakeService";
import { mapCustomerUploadPurgeTimestamp } from "../utils/customerUploadPurgeTimestamp";
import { filterCustomersForIntakeSearch } from "../utils/customerUploadIntakeSearch";
import { fetchIntakeDocsForMatchedCustomers } from "../utils/fetchIntakeDocsForMatchedCustomers";
import {
  buildPurposeScopedIntakeQuery,
  buildPurposeScopedDeniedCountQuery,
  buildStatusScopedCatalogReviewQuery,
  CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY,
  CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE,
  filterCatalogIntakeEligibleDocs,
  filterDeniedStudioIntakeDocs,
  filterLegacyMissingPurposeDocs,
  filterStaffExcludedIntakeDocs,
  mergeIntakeDocsByCreatedAtDesc,
  runWithConcurrencyLimit,
} from "../utils/customerUploadIntakeQueries";

export type CustomerUploadIntakePendingAction =
  | "promote"
  | "exclude"
  | "request_permission"
  | "restore"
  | "retry"
  | "delete"
  | "halftone"
  | "artwork_background";

type EnrichmentCacheEntry = {
  customerDisplayName: string;
  customerUsername: string | null;
  printRequestName: string | null;
  printRequestStatus: string | null;
  printRequestQueueTab: string | null;
  printRequestIsInternal: boolean | null;
  printRequestItemCount: number | null;
  printRequestUpdatedAtMs: number | null;
  previewUrl: string | null;
};

type IntakeDocRef = {
  id: string;
  data: () => Record<string, unknown>;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampMs(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function toIntakeDocRef(docSnap: QueryDocumentSnapshot): IntakeDocRef {
  return {
    id: docSnap.id,
    data: () => docSnap.data() as Record<string, unknown>,
  };
}

function buildShellRow(
  uploadDoc: IntakeDocRef,
  enrichment?: EnrichmentCacheEntry | null,
): CustomerUploadIntakeRow {
  const data = uploadDoc.data();
  const customerId = asString(data.customerId) ?? "";
  return {
    id: uploadDoc.id,
    batchId: asString(data.batchId) ?? "",
    customerUid: asString(data.customerUid) ?? "",
    customerId,
    customerDisplayName: enrichment?.customerDisplayName ?? (customerId || "Customer"),
    customerUsername: enrichment?.customerUsername ?? null,
    printRequestId: asString(data.printRequestId),
    printRequestName: enrichment?.printRequestName ?? null,
    printRequestStatus: enrichment?.printRequestStatus ?? null,
    printRequestQueueTab: enrichment?.printRequestQueueTab ?? null,
    printRequestIsInternal: enrichment?.printRequestIsInternal ?? null,
    printRequestItemCount: enrichment?.printRequestItemCount ?? null,
    printRequestUpdatedAtMs: enrichment?.printRequestUpdatedAtMs ?? null,
    showAssignmentLabel: null,
    originalFilename: asString(data.originalFilename) ?? "Uploaded artwork",
    sourceFormat: (asString(data.sourceFormat) as CustomerUploadIntakeRow["sourceFormat"]) ?? null,
    productionStoragePath: asString(data.productionStoragePath),
    previewStoragePath: asString(data.previewStoragePath),
    thumbnailStoragePath: asString(data.thumbnailStoragePath),
    previewUrl: enrichment?.previewUrl ?? null,
    widthPx: asNumber(data.widthPx),
    heightPx: asNumber(data.heightPx),
    sourceWidthPx: asNumber(data.sourceWidthPx),
    sourceHeightPx: asNumber(data.sourceHeightPx),
    printWidthInches: asNumber(data.printWidthInches),
    printHeightInches: asNumber(data.printHeightInches),
    effectiveDpi: asNumber(data.effectiveDpi),
    transparencyPassed:
      typeof data.transparencyPassed === "boolean" ? data.transparencyPassed : null,
    technicalStatus: data.technicalStatus as CustomerUploadIntakeRow["technicalStatus"],
    technicalFailureCode: asString(data.technicalFailureCode),
    technicalFailureMessage: asString(data.technicalFailureMessage),
    catalogReviewStatus: data.catalogReviewStatus as CustomerUploadIntakeRow["catalogReviewStatus"],
    promotedDesignId: asString(data.promotedDesignId),
    ownershipConfirmed: data.ownershipConfirmed === true,
    catalogUseAcknowledged:
      typeof data.catalogUseAcknowledged === "boolean" ? data.catalogUseAcknowledged : null,
    catalogExclusionReason:
      data.catalogExclusionReason === "staff_review" ||
      data.catalogExclusionReason === "customer_permission_denied"
        ? data.catalogExclusionReason
        : null,
    catalogPermissionFollowUpStatus:
      data.catalogPermissionFollowUpStatus === "requested" ||
      data.catalogPermissionFollowUpStatus === "approved" ||
      data.catalogPermissionFollowUpStatus === "declined"
        ? data.catalogPermissionFollowUpStatus
        : "not_requested",
    catalogPermissionAskCount: resolveCustomerUploadPermissionAskCount({
      catalogPermissionAskCount: data.catalogPermissionAskCount,
      catalogPermissionFollowUpStatus: data.catalogPermissionFollowUpStatus,
    }),
    catalogPermissionActivity: normalizeCustomerUploadPermissionActivity(
      data.catalogPermissionActivity,
    ),
    catalogPermissionOriginalDeniedAtMs: timestampMs(data.catalogPermissionOriginalDeniedAt),
    catalogRetentionStartedAtMs: timestampMs(data.catalogRetentionStartedAt),
    purpose: resolveCustomerUploadPurpose(data.purpose),
    createdAtMs: timestampMs(data.createdAt),
    fullSizePurgedAtMs: mapCustomerUploadPurgeTimestamp(data.fullSizePurgedAt),
    approvedMaxPrintWidthInches: asNumber(data.approvedMaxPrintWidthInches),
    approvedMaxPrintHeightInches: asNumber(data.approvedMaxPrintHeightInches),
    wasUpscaled: typeof data.wasUpscaled === "boolean" ? data.wasUpscaled : null,
    upscaleFactor: asNumber(data.upscaleFactor),
    sizingWarningCode: asString(data.sizingWarningCode),
    halftoneDetection:
      data.halftoneDetection && typeof data.halftoneDetection === "object"
        ? (data.halftoneDetection as CustomerUploadIntakeRow["halftoneDetection"])
        : null,
    halftoneSubmitterResponse:
      data.halftoneSubmitterResponse && typeof data.halftoneSubmitterResponse === "object"
        ? (data.halftoneSubmitterResponse as CustomerUploadIntakeRow["halftoneSubmitterResponse"])
        : null,
    halftoneStaffDecision:
      data.halftoneStaffDecision && typeof data.halftoneStaffDecision === "object"
        ? (data.halftoneStaffDecision as CustomerUploadIntakeRow["halftoneStaffDecision"])
        : null,
    artworkBackgroundHex: asString(data.artworkBackgroundHex),
    artworkBackgroundSource:
      data.artworkBackgroundSource && typeof data.artworkBackgroundSource === "string"
        ? (data.artworkBackgroundSource as CustomerUploadIntakeRow["artworkBackgroundSource"])
        : null,
    suggestDarkArtworkBackground: data.suggestDarkArtworkBackground === true,
    assistedCreationRequestId: asString(data.assistedCreationRequestId),
    assistedProofId: asString(data.assistedProofId),
  };
}

/**
 * Live intake list + keyed mutation state.
 * Card actions never flip full-page loading (avoids remount / �full refresh�).
 * Route loading clears after purpose-scoped metadata; images fill progressively.
 */
export function useCustomerUploadIntake(options?: {
  purposeScope?: CustomerUploadPurpose;
}) {
  const purposeScope = options?.purposeScope ?? "print_request";
  const { user } = useAuth();
  const canView = Boolean(user && permissionService.canViewCustomerUploadIntake(user));
  const canExclude = Boolean(user && permissionService.canExcludeCustomerUploadFromCatalog(user));
  const canPromote = Boolean(user && permissionService.canPromoteCustomerUploadToAiReview(user));
  const canRetry = Boolean(user && permissionService.canRetryCustomerUploadProcessing(user));
  const canDeleteEligible = Boolean(user && permissionService.canDeleteEligibleCustomerUpload(user));

  const [filter, setFilter] = useState<CustomerUploadIntakeFilter>("pending_staff_review");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [rows, setRows] = useState<CustomerUploadIntakeRow[]>([]);
  const rowsRef = useRef<CustomerUploadIntakeRow[]>([]);
  rowsRef.current = rows;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [pendingByUploadId, setPendingByUploadId] = useState<
    Partial<Record<string, CustomerUploadIntakePendingAction>>
  >({});
  /** Durable metadata save failed � blocks promote until Retry succeeds. */
  const [metadataFailedByUploadId, setMetadataFailedByUploadId] = useState<
    Partial<Record<string, "halftone" | "artwork_background">>
  >({});
  /**
   * In-flight / failed optimistic metadata. Applied on top of every snapshot remap so
   * Firestore listener emissions cannot flash the control back to stale server values
   * before persist completes (first-click latency root cause companion).
   */
  const metadataOverridesRef = useRef(
    new Map<
      string,
      Partial<
        Pick<
          CustomerUploadIntakeRow,
          "halftoneStaffDecision" | "artworkBackgroundHex" | "artworkBackgroundSource"
        >
      >
    >(),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deniedCount, setDeniedCount] = useState(0);
  const enrichmentCacheRef = useRef(new Map<string, EnrichmentCacheEntry>());
  const enrichGenerationRef = useRef(0);

  const patchRowEnrichment = useCallback((uploadId: string, enrichment: EnrichmentCacheEntry) => {
    setRows((current) =>
      current.map((row) =>
        row.id === uploadId
          ? {
              ...row,
              customerDisplayName: enrichment.customerDisplayName,
              customerUsername: enrichment.customerUsername,
              printRequestName: enrichment.printRequestName,
              printRequestStatus: enrichment.printRequestStatus,
              printRequestQueueTab: enrichment.printRequestQueueTab,
              printRequestIsInternal: enrichment.printRequestIsInternal,
              printRequestItemCount: enrichment.printRequestItemCount,
              printRequestUpdatedAtMs: enrichment.printRequestUpdatedAtMs,
              previewUrl: enrichment.previewUrl,
            }
          : row,
      ),
    );
  }, []);

  const enrichDocsProgressively = useCallback(
    async (docs: IntakeDocRef[], generation: number) => {
      await runWithConcurrencyLimit(
        docs,
        CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY,
        async (uploadDoc) => {
          if (enrichGenerationRef.current !== generation) {
            return;
          }
          const cacheKey = uploadDoc.id;
          const cached = enrichmentCacheRef.current.get(cacheKey);
          if (cached) {
            patchRowEnrichment(cacheKey, cached);
            return;
          }

          const data = uploadDoc.data();
          const customerId = asString(data.customerId) ?? "";
          const printRequestId = asString(data.printRequestId);
          const previewStoragePath =
            asString(data.previewStoragePath) ?? asString(data.thumbnailStoragePath);

          const enriched = await customerUploadIntakeService.enrichRowLookups({
            customerId,
            printRequestId,
            previewStoragePath,
          });
          if (enrichGenerationRef.current !== generation) {
            return;
          }
          enrichmentCacheRef.current.set(cacheKey, enriched);
          patchRowEnrichment(cacheKey, enriched);
        },
      );
    },
    [patchRowEnrichment],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPageSize(CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE);
    setHasMore(false);
  }, [filter, purposeScope, debouncedSearchQuery]);

  const refreshDeniedCount = useCallback(async () => {
    if (!canView || purposeScope !== "print_request") {
      setDeniedCount(0);
      return;
    }
    try {
      const snapshot = await getDocs(buildPurposeScopedDeniedCountQuery(db, purposeScope));
      setDeniedCount(filterDeniedStudioIntakeDocs(snapshot.docs).length);
    } catch {
      // Keep the intake usable if a newly required index is still provisioning.
      setDeniedCount(0);
    }
  }, [canView, purposeScope]);

  useEffect(() => {
    void refreshDeniedCount();
  }, [refreshDeniedCount]);

  const applyShellRowsFromDocs = useCallback((intakeDocs: IntakeDocRef[]) => {
    const shellRows = intakeDocs.map((docSnap) => {
      const base = buildShellRow(docSnap, enrichmentCacheRef.current.get(docSnap.id) ?? null);
      const override = metadataOverridesRef.current.get(docSnap.id);
      return override ? { ...base, ...override } : base;
    });

    setRows(shellRows);
    setSelectedId((current) => {
      if (current && shellRows.some((row) => row.id === current)) {
        return current;
      }
      return shellRows[0]?.id ?? null;
    });
    setIsInitialLoading(false);

    const generation = ++enrichGenerationRef.current;
    void enrichDocsProgressively(intakeDocs, generation);
  }, [enrichDocsProgressively]);

  useEffect(() => {
    if (!user || !canView) {
      setRows([]);
      setIsInitialLoading(false);
      setHasMore(false);
      setDeniedCount(0);
      return;
    }

    // Search mode uses a separate one-shot fetch effect.
    if (debouncedSearchQuery) {
      return;
    }

    setIsInitialLoading(true);
    setError(null);
    enrichGenerationRef.current += 1;

    let cancelled = false;
    let primarySnap: ReturnType<typeof toIntakeDocRef>[] | null = null;
    let legacySnap: ReturnType<typeof toIntakeDocRef>[] | null =
      purposeScope === "print_request" ? null : [];
    const unsubscribers: Unsubscribe[] = [];

    const applyMergedSnapshot = () => {
      if (cancelled || primarySnap === null || legacySnap === null) {
        return;
      }

      const merged = mergeIntakeDocsByCreatedAtDesc(primarySnap, legacySnap, pageSize);
      const intakeDocs =
        filter === "pending_staff_review"
          ? filterCatalogIntakeEligibleDocs(merged)
          : filter === "denied"
            ? filterDeniedStudioIntakeDocs(merged)
            : filter === "excluded_from_catalog"
              ? filterStaffExcludedIntakeDocs(merged)
              : merged;
      setHasMore(primarySnap.length >= pageSize);
      applyShellRowsFromDocs(intakeDocs);
      if (purposeScope === "print_request") {
        void refreshDeniedCount();
      }
      setIsLoadingMore(false);
    };

    const primaryQuery = buildPurposeScopedIntakeQuery(db, {
      purpose: purposeScope,
      catalogReviewStatus: filter,
      pageSize,
    });
    const primaryTrace = {
      app: "studio" as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      constraints: [
        `purpose==${purposeScope}`,
        `catalogReviewStatus==${filter}`,
        "orderBy createdAt desc",
        `limit ${pageSize}`,
      ],
      source: "useCustomerUploadIntake",
      triggerReason: "route" as const,
    };
    traceFirestoreListenerAttach(primaryTrace);
    unsubscribers.push(
      traceWrappedUnsubscribe(
        primaryTrace,
        onSnapshot(
          primaryQuery,
          (snapshot) => {
            traceFirestoreListenerEmission(primaryTrace, snapshot.size);
            primarySnap = snapshot.docs.map(toIntakeDocRef);
            applyMergedSnapshot();
          },
          (err) => {
            if (cancelled) {
              return;
            }
            setError(err.message || "Unable to load customer uploads.");
            setRows([]);
            setHasMore(false);
            setIsInitialLoading(false);
            setIsLoadingMore(false);
          },
        ),
      ),
    );

    if (purposeScope === "print_request") {
      const legacyQuery = buildStatusScopedCatalogReviewQuery(db, filter);
      const legacyTrace = {
        app: "studio" as const,
        collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
        constraints: [`catalogReviewStatus==${filter}`, "legacyMissingPurposeOnly"],
        source: "useCustomerUploadIntake.legacyMissingPurpose",
        triggerReason: "route" as const,
      };
      traceFirestoreListenerAttach(legacyTrace);
      unsubscribers.push(
        traceWrappedUnsubscribe(
          legacyTrace,
          onSnapshot(
            legacyQuery,
            (snapshot) => {
              const refs = snapshot.docs.map(toIntakeDocRef);
              legacySnap = filterLegacyMissingPurposeDocs(refs);
              traceFirestoreListenerEmission(legacyTrace, legacySnap.length);
              applyMergedSnapshot();
            },
            (err) => {
              if (cancelled) {
                return;
              }
              console.warn(
                "[useCustomerUploadIntake] legacy missing-purpose companion failed:",
                err.message,
              );
              legacySnap = [];
              applyMergedSnapshot();
            },
          ),
        ),
      );
    }

    return () => {
      cancelled = true;
      enrichGenerationRef.current += 1;
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [
    applyShellRowsFromDocs,
    canView,
    debouncedSearchQuery,
    filter,
    pageSize,
    purposeScope,
    refreshDeniedCount,
    user,
  ]);

  useEffect(() => {
    if (!user || !canView || !debouncedSearchQuery) {
      return;
    }

    let cancelled = false;
    setIsInitialLoading(true);
    setError(null);
    enrichGenerationRef.current += 1;

    void (async () => {
      try {
        const customers = await customerService.listCustomersForIntakeSearch(user);
        if (cancelled) {
          return;
        }
        const matched = filterCustomersForIntakeSearch(customers, debouncedSearchQuery);
        if (matched.length === 0) {
          setRows([]);
          setSelectedId(null);
          setHasMore(false);
          setIsInitialLoading(false);
          setIsLoadingMore(false);
          return;
        }

        const { docs, hasMore: moreAvailable } = await fetchIntakeDocsForMatchedCustomers({
          db,
          customers: matched,
          purpose: purposeScope,
          catalogReviewStatus: filter,
          perCustomerLimit: pageSize,
        });
        if (cancelled) {
          return;
        }
        setHasMore(moreAvailable);
        applyShellRowsFromDocs(docs);
        setIsLoadingMore(false);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to search customer uploads.");
        setRows([]);
        setHasMore(false);
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    })();

    return () => {
      cancelled = true;
      enrichGenerationRef.current += 1;
    };
  }, [
    applyShellRowsFromDocs,
    canView,
    debouncedSearchQuery,
    filter,
    pageSize,
    purposeScope,
    user,
  ]);

  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    setPageSize((current) => current + CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE);
  }, []);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const setPending = useCallback(
    (uploadId: string, action: CustomerUploadIntakePendingAction | null) => {
      setPendingByUploadId((current) => {
        const next = { ...current };
        if (action === null) {
          delete next[uploadId];
        } else {
          next[uploadId] = action;
        }
        return next;
      });
    },
    [],
  );

  const removeRowLocally = useCallback((uploadId: string) => {
    enrichmentCacheRef.current.delete(uploadId);
    setRows((current) => current.filter((row) => row.id !== uploadId));
    setSelectedId((current) => (current === uploadId ? null : current));
  }, []);

  const patchRowLocally = useCallback(
    (uploadId: string, patch: Partial<CustomerUploadIntakeRow>) => {
      setRows((current) =>
        current.map((row) => (row.id === uploadId ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const clearMetadataOverrideKeys = useCallback(
    (
      uploadId: string,
      keys: Array<"halftoneStaffDecision" | "artworkBackgroundHex" | "artworkBackgroundSource">,
    ) => {
      const existing = metadataOverridesRef.current.get(uploadId);
      if (!existing) {
        return;
      }
      const next = { ...existing };
      for (const key of keys) {
        delete next[key];
      }
      if (Object.keys(next).length === 0) {
        metadataOverridesRef.current.delete(uploadId);
      } else {
        metadataOverridesRef.current.set(uploadId, next);
      }
    },
    [],
  );

  const runMutation = useCallback(
    async (
      uploadId: string,
      action: CustomerUploadIntakePendingAction,
      execute: () => Promise<void>,
      successMessage: string,
      onSuccess?: () => void,
    ) => {
      if (pendingByUploadId[uploadId]) {
        return false;
      }
      setPending(uploadId, action);
      setError(null);
      setNotice(null);
      try {
        await execute();
        setNotice(successMessage);
        onSuccess?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed.");
        return false;
      } finally {
        setPending(uploadId, null);
      }
    },
    [pendingByUploadId, setPending],
  );

  const refresh = useCallback(async () => {
    enrichmentCacheRef.current.clear();
    setNotice("List updates live from Firestore.");
  }, []);

  return {
    canView,
    canExclude,
    canPromote,
    canRetry,
    canDeleteEligible,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    rows,
    selected,
    selectedId,
    setSelectedId,
    isLoading: isInitialLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    pendingByUploadId,
    metadataFailedByUploadId,
    actionBusyId: null as string | null,
    error,
    notice,
    deniedCount,
    refresh,
    promote: async (uploadId: string) => {
      const currentPending = pendingByUploadId[uploadId];
      if (currentPending === "halftone" || currentPending === "artwork_background") {
        setError("Cannot send to AI Review while Halftone or Artwork Background changes are being saved.");
        return false;
      }
      if (metadataFailedByUploadId[uploadId]) {
        setError(
          "Cannot send to AI Review until Halftone / Artwork Background save succeeds. Use Retry metadata save.",
        );
        return false;
      }

      return await runMutation(
        uploadId,
        "promote",
        async () => {
          const row = rowsRef.current.find((item) => item.id === uploadId);
          const resolvedToggle = resolveIntakeHalftoneStaffToggle({
            staffDecision: row?.halftoneStaffDecision,
            submitterResponse: row?.halftoneSubmitterResponse,
          });
          if (row && typeof row.halftoneStaffDecision?.value !== "boolean") {
            await customerUploadIntakeService.recordHalftoneStaffDecision(uploadId, resolvedToggle);
            patchRowLocally(uploadId, {
              halftoneStaffDecision: {
                value: resolvedToggle,
                isExplicitOverride: true,
                decidedBy: user?.id ?? null,
              },
            });
          }
          const result = await customerUploadIntakeService.promote(uploadId);
          enqueueImportedDesignsForBackgroundAi([result.designId]);
          setNotice("Sent to AI Review. AI processing starts in the background.");
        },
        "Sent to AI Review.",
        () => {
          if (filter === "pending_staff_review") {
            removeRowLocally(uploadId);
          } else {
            patchRowLocally(uploadId, { catalogReviewStatus: "sent_to_ai_review" });
          }
          void refreshDeniedCount();
        },
      );
    },
    exclude: (uploadId: string) =>
      runMutation(
        uploadId,
        "exclude",
        async () => {
          await customerUploadIntakeService.exclude(uploadId);
        },
        "Excluded from catalog. Upload metadata and stored artwork were preserved.",
        () => {
          if (filter === "pending_staff_review") {
            removeRowLocally(uploadId);
          } else {
            patchRowLocally(uploadId, { catalogReviewStatus: "excluded_from_catalog" });
          }
          void refreshDeniedCount();
        },
      ),
    requestPermissionFollowUp: (uploadId: string) =>
      runMutation(
        uploadId,
        "request_permission",
        async () => {
          await customerUploadIntakeService.requestPermissionFollowUp(uploadId);
        },
        "Permission follow-up sent to the customer.",
        () => {
          patchRowLocally(uploadId, { catalogPermissionFollowUpStatus: "requested" });
          void refreshDeniedCount();
        },
      ),
    restore: (uploadId: string) =>
      runMutation(
        uploadId,
        "restore",
        async () => {
          await customerUploadIntakeService.restore(uploadId);
        },
        "Restored to pending staff review.",
        () => {
          if (filter === "excluded_from_catalog") {
            removeRowLocally(uploadId);
          } else {
            patchRowLocally(uploadId, { catalogReviewStatus: "pending_staff_review" });
          }
          void refreshDeniedCount();
        },
      ),
    retry: (uploadId: string) =>
      runMutation(
        uploadId,
        "retry",
        async () => {
          const result = await customerUploadIntakeService.retry(uploadId);
          if (result.technicalStatus !== "ready") {
            throw new Error(result.technicalFailureMessage ?? "Retry failed.");
          }
          patchRowLocally(uploadId, {
            technicalStatus: "ready",
            technicalFailureMessage: null,
            technicalFailureCode: null,
          });
        },
        "Technical processing retry succeeded.",
      ),
    deleteCompleted: (uploadId: string, message: string) => {
      setError(null);
      setNotice(message || "Unused customer upload deleted.");
      removeRowLocally(uploadId);
    },
    setHalftoneDecision: async (
      uploadId: string,
      value: boolean,
      options?: { defaultDarkBackgroundWhenAuto?: boolean },
    ) => {
      if (pendingByUploadId[uploadId]) {
        return false;
      }

      setError(null);
      setPending(uploadId, "halftone");
      setMetadataFailedByUploadId((current) => {
        if (!current[uploadId]) {
          return current;
        }
        const next = { ...current };
        delete next[uploadId];
        return next;
      });

      const optimisticDecision = {
        value,
        isExplicitOverride: true,
        decidedBy: user?.id ?? null,
      } as CustomerUploadIntakeRow["halftoneStaffDecision"];
      const shouldDefaultDarkBackground = value && options?.defaultDarkBackgroundWhenAuto === true;

      metadataOverridesRef.current.set(uploadId, {
        ...metadataOverridesRef.current.get(uploadId),
        halftoneStaffDecision: optimisticDecision,
        ...(shouldDefaultDarkBackground
          ? {
              artworkBackgroundHex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
              artworkBackgroundSource: "staff_manual" as const,
            }
          : {}),
      });

      // OPTIMISTIC: Patch locally FIRST (before any await).
      patchRowLocally(uploadId, {
        halftoneStaffDecision: optimisticDecision,
        ...(shouldDefaultDarkBackground
          ? {
              artworkBackgroundHex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
              artworkBackgroundSource: "staff_manual" as const,
            }
          : {}),
      });

      try {
        await customerUploadIntakeService.recordHalftoneStaffDecision(uploadId, value);
        clearMetadataOverrideKeys(uploadId, ["halftoneStaffDecision"]);

        if (shouldDefaultDarkBackground) {
          try {
            await customerUploadIntakeService.recordArtworkBackgroundStaffDecision(
              uploadId,
              ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
            );
            clearMetadataOverrideKeys(uploadId, ["artworkBackgroundHex", "artworkBackgroundSource"]);
          } catch (err) {
            setMetadataFailedByUploadId((current) => ({
              ...current,
              [uploadId]: "artwork_background",
            }));
            setError(
              err instanceof Error
                ? err.message
                : "Unable to save artwork background decision.",
            );
            return false;
          }
        }
        return true;
      } catch (err) {
        // Keep intended local choice + override visible; latch failed so promote is blocked until Retry.
        setMetadataFailedByUploadId((current) => ({ ...current, [uploadId]: "halftone" }));
        setError(err instanceof Error ? err.message : "Unable to save Halftone decision.");
        return false;
      } finally {
        // Always clear — early returns previously left the row permanently disabled.
        setPending(uploadId, null);
      }
    },

    setArtworkBackgroundDecision: async (
      uploadId: string,
      hex: string | null,
      source: import("@fresh-prints/shared/types/design/artworkBackgroundSource.types").ArtworkBackgroundSource | null,
    ) => {
      if (pendingByUploadId[uploadId]) {
        return false;
      }

      setError(null);
      setPending(uploadId, "artwork_background");
      setMetadataFailedByUploadId((current) => {
        if (!current[uploadId]) {
          return current;
        }
        const next = { ...current };
        delete next[uploadId];
        return next;
      });

      metadataOverridesRef.current.set(uploadId, {
        ...metadataOverridesRef.current.get(uploadId),
        artworkBackgroundHex: hex,
        artworkBackgroundSource: source,
      });

      // OPTIMISTIC: Patch locally FIRST (before any await).
      patchRowLocally(uploadId, {
        artworkBackgroundHex: hex,
        artworkBackgroundSource: source,
      });

      try {
        await customerUploadIntakeService.recordArtworkBackgroundStaffDecision(uploadId, hex, {
          clearArtworkBackground: source === null || source === "code_auto",
        });
        clearMetadataOverrideKeys(uploadId, ["artworkBackgroundHex", "artworkBackgroundSource"]);
        return true;
      } catch (err) {
        setMetadataFailedByUploadId((current) => ({
          ...current,
          [uploadId]: "artwork_background",
        }));
        setError(err instanceof Error ? err.message : "Unable to save artwork background decision.");
        return false;
      } finally {
        setPending(uploadId, null);
      }
    },

    retryMetadataSave: async (uploadId: string) => {
      if (pendingByUploadId[uploadId]) {
        return false;
      }
      const failedKind = metadataFailedByUploadId[uploadId];
      if (!failedKind) {
        return true;
      }
      const row = rowsRef.current.find((item) => item.id === uploadId);
      if (!row) {
        return false;
      }

      setError(null);
      if (failedKind === "halftone") {
        const value = row.halftoneStaffDecision?.value;
        if (typeof value !== "boolean") {
          setMetadataFailedByUploadId((current) => {
            const next = { ...current };
            delete next[uploadId];
            return next;
          });
          return true;
        }
        setPending(uploadId, "halftone");
        try {
          await customerUploadIntakeService.recordHalftoneStaffDecision(uploadId, value);
          if (row.artworkBackgroundSource === "staff_manual") {
            await customerUploadIntakeService.recordArtworkBackgroundStaffDecision(
              uploadId,
              row.artworkBackgroundHex ?? null,
            );
            clearMetadataOverrideKeys(uploadId, [
              "artworkBackgroundHex",
              "artworkBackgroundSource",
            ]);
          }
          setMetadataFailedByUploadId((current) => {
            const next = { ...current };
            delete next[uploadId];
            return next;
          });
          clearMetadataOverrideKeys(uploadId, ["halftoneStaffDecision"]);
          setNotice("Halftone decision saved.");
          return true;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to save Halftone decision.");
          return false;
        } finally {
          setPending(uploadId, null);
        }
      }

      setPending(uploadId, "artwork_background");
      try {
        await customerUploadIntakeService.recordArtworkBackgroundStaffDecision(
          uploadId,
          row.artworkBackgroundHex,
          { clearArtworkBackground: row.artworkBackgroundSource === null },
        );
        setMetadataFailedByUploadId((current) => {
          const next = { ...current };
          delete next[uploadId];
          return next;
        });
        clearMetadataOverrideKeys(uploadId, ["artworkBackgroundHex", "artworkBackgroundSource"]);
        setNotice("Artwork background saved.");
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save artwork background decision.");
        return false;
      } finally {
        setPending(uploadId, null);
      }
    },
  };
}
