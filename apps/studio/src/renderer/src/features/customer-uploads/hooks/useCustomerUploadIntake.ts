import { useCallback, useEffect, useRef, useState } from "react";
import { onSnapshot, type QueryDocumentSnapshot, type Unsubscribe } from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";
import { resolveIntakeHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { enqueueImportedDesignsForBackgroundAi } from "../../imports/services/importAiBackgroundQueue";
import {
  customerUploadIntakeService,
  type CustomerUploadIntakeFilter,
  type CustomerUploadIntakeRow,
} from "../services/customerUploadIntakeService";
import { mapCustomerUploadPurgeTimestamp } from "../utils/customerUploadPurgeTimestamp";
import {
  buildPurposeScopedIntakeQuery,
  buildStatusScopedCatalogReviewQuery,
  CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY,
  filterLegacyMissingPurposeDocs,
  mergeIntakeDocsByCreatedAtDesc,
  runWithConcurrencyLimit,
} from "../utils/customerUploadIntakeQueries";

export type CustomerUploadIntakePendingAction =
  | "promote"
  | "exclude"
  | "restore"
  | "retry"
  | "delete";

type EnrichmentCacheEntry = {
  customerDisplayName: string;
  printRequestName: string | null;
  printRequestStatus: string | null;
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
    printRequestId: asString(data.printRequestId),
    printRequestName: enrichment?.printRequestName ?? null,
    printRequestStatus: enrichment?.printRequestStatus ?? null,
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
    assistedCreationRequestId: asString(data.assistedCreationRequestId),
    assistedProofId: asString(data.assistedProofId),
  };
}

/**
 * Live intake list + keyed mutation state.
 * Card actions never flip full-page loading (avoids remount / “full refresh”).
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
  const [rows, setRows] = useState<CustomerUploadIntakeRow[]>([]);
  const rowsRef = useRef<CustomerUploadIntakeRow[]>([]);
  rowsRef.current = rows;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [pendingByUploadId, setPendingByUploadId] = useState<
    Partial<Record<string, CustomerUploadIntakePendingAction>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const enrichmentCacheRef = useRef(new Map<string, EnrichmentCacheEntry>());
  const enrichGenerationRef = useRef(0);

  const patchRowEnrichment = useCallback((uploadId: string, enrichment: EnrichmentCacheEntry) => {
    setRows((current) =>
      current.map((row) =>
        row.id === uploadId
          ? {
              ...row,
              customerDisplayName: enrichment.customerDisplayName,
              printRequestName: enrichment.printRequestName,
              printRequestStatus: enrichment.printRequestStatus,
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
    if (!user || !canView) {
      setRows([]);
      setIsInitialLoading(false);
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

      const merged = mergeIntakeDocsByCreatedAtDesc(primarySnap, legacySnap);
      const shellRows = merged.map((docSnap) =>
        buildShellRow(docSnap, enrichmentCacheRef.current.get(docSnap.id) ?? null),
      );

      setRows(shellRows);
      setSelectedId((current) => {
        if (current && shellRows.some((row) => row.id === current)) {
          return current;
        }
        return shellRows[0]?.id ?? null;
      });
      setIsInitialLoading(false);

      const generation = ++enrichGenerationRef.current;
      void enrichDocsProgressively(merged, generation);
    };

    const primaryQuery = buildPurposeScopedIntakeQuery(db, {
      purpose: purposeScope,
      catalogReviewStatus: filter,
    });
    const primaryTrace = {
      app: "studio" as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      constraints: [
        `purpose==${purposeScope}`,
        `catalogReviewStatus==${filter}`,
        "orderBy createdAt desc",
        "limit 50",
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
            setIsInitialLoading(false);
          },
        ),
      ),
    );

    // H-DM-2: Firestore purpose==print_request excludes missing-purpose legacy docs.
    // Status-scoped companion is metadata-only; filter before any enrichment.
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
              // Purpose-scoped primary remains authoritative; fail open without legacy merge.
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
  }, [user, canView, filter, purposeScope, enrichDocsProgressively]);

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
    rows,
    selected,
    selectedId,
    setSelectedId,
    isLoading: isInitialLoading,
    pendingByUploadId,
    actionBusyId: null as string | null,
    error,
    notice,
    refresh,
    promote: async (uploadId: string) => {
      await runMutation(
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
    setHalftoneDecision: async (uploadId: string, value: boolean) => {
      setError(null);
      try {
        await customerUploadIntakeService.recordHalftoneStaffDecision(uploadId, value);
        patchRowLocally(uploadId, {
          halftoneStaffDecision: {
            value,
            isExplicitOverride: true,
            decidedBy: user?.id ?? null,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save Halftone decision.");
      }
    },
  };
}
