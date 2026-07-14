import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadPurpose } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";
import { resolveIntakeHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";

import { db } from "../../../config/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  customerUploadIntakeService,
  type CustomerUploadIntakeFilter,
  type CustomerUploadIntakeRow,
} from "../services/customerUploadIntakeService";

export type CustomerUploadIntakePendingAction =
  | "promote"
  | "exclude"
  | "restore"
  | "retry";

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

/**
 * Live intake list + keyed mutation state.
 * Card actions never flip full-page loading (avoids remount / “full refresh”).
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
  const enrichmentCacheRef = useRef(
    new Map<
      string,
      {
        customerDisplayName: string;
        printRequestName: string | null;
        printRequestStatus: string | null;
        previewUrl: string | null;
      }
    >(),
  );

  const mapSnapshotDocs = useCallback(
    async (
      docs: Array<{ id: string; data: () => Record<string, unknown> }>,
    ): Promise<CustomerUploadIntakeRow[]> => {
      const nextRows: CustomerUploadIntakeRow[] = [];

      for (const uploadDoc of docs) {
        const data = uploadDoc.data();
        const customerId = asString(data.customerId) ?? "";
        const printRequestId = asString(data.printRequestId);
        const previewStoragePath =
          asString(data.previewStoragePath) ?? asString(data.thumbnailStoragePath);
        const cacheKey = uploadDoc.id;
        const cached = enrichmentCacheRef.current.get(cacheKey);

        let customerDisplayName = cached?.customerDisplayName ?? (customerId || "Customer");
        let printRequestName = cached?.printRequestName ?? null;
        let printRequestStatus = cached?.printRequestStatus ?? null;
        let previewUrl = cached?.previewUrl ?? null;

        if (!cached) {
          const enriched = await customerUploadIntakeService.enrichRowLookups({
            customerId,
            printRequestId,
            previewStoragePath,
          });
          customerDisplayName = enriched.customerDisplayName;
          printRequestName = enriched.printRequestName;
          printRequestStatus = enriched.printRequestStatus;
          previewUrl = enriched.previewUrl;
          enrichmentCacheRef.current.set(cacheKey, {
            customerDisplayName,
            printRequestName,
            printRequestStatus,
            previewUrl,
          });
        }

        nextRows.push({
          id: uploadDoc.id,
          batchId: asString(data.batchId) ?? "",
          customerUid: asString(data.customerUid) ?? "",
          customerId,
          customerDisplayName,
          printRequestId,
          printRequestName,
          printRequestStatus,
          showAssignmentLabel: null,
          originalFilename: asString(data.originalFilename) ?? "Uploaded artwork",
          sourceFormat: (asString(data.sourceFormat) as CustomerUploadIntakeRow["sourceFormat"]) ?? null,
          productionStoragePath: asString(data.productionStoragePath),
          previewStoragePath: asString(data.previewStoragePath),
          thumbnailStoragePath: asString(data.thumbnailStoragePath),
          previewUrl,
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
          catalogReviewStatus:
            data.catalogReviewStatus as CustomerUploadIntakeRow["catalogReviewStatus"],
          promotedDesignId: asString(data.promotedDesignId),
          ownershipConfirmed: data.ownershipConfirmed === true,
          catalogUseAcknowledged: data.catalogUseAcknowledged === true,
          purpose: resolveCustomerUploadPurpose(data.purpose),
          createdAtMs: timestampMs(data.createdAt),
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
        });
      }

      return nextRows;
    },
    [],
  );

  useEffect(() => {
    if (!user || !canView) {
      setRows([]);
      setIsInitialLoading(false);
      return;
    }

    setIsInitialLoading(true);
    setError(null);

    let cancelled = false;
    let unsubscribe: Unsubscribe | null = null;

    const intakeQuery = query(
      collection(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
      where("catalogReviewStatus", "==", filter),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    unsubscribe = onSnapshot(
      intakeQuery,
      (snapshot) => {
        void (async () => {
          try {
            const mapped = await mapSnapshotDocs(
              snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                data: () => docSnap.data() as Record<string, unknown>,
              })),
            );
            // Client-side purpose filter reuses existing catalogReviewStatus+createdAt index
            // (avoids requiring undeployed purpose composite indexes for local QA).
            const scoped =
              purposeScope === "catalog_donation"
                ? mapped.filter((row) => row.purpose === "catalog_donation")
                : mapped.filter((row) => row.purpose !== "catalog_donation");
            if (cancelled) {
              return;
            }
            setRows(scoped);
            setSelectedId((current) => {
              if (current && scoped.some((row) => row.id === current)) {
                return current;
              }
              return scoped[0]?.id ?? null;
            });
            setIsInitialLoading(false);
          } catch (err) {
            if (cancelled) {
              return;
            }
            setError(err instanceof Error ? err.message : "Unable to load customer uploads.");
            setIsInitialLoading(false);
          }
        })();
      },
      (err) => {
        if (cancelled) {
          return;
        }
        setError(err.message || "Unable to load customer uploads.");
        setRows([]);
        setIsInitialLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, canView, filter, mapSnapshotDocs, purposeScope]);

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
        return;
      }
      setPending(uploadId, action);
      setError(null);
      setNotice(null);
      try {
        await execute();
        setNotice(successMessage);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setPending(uploadId, null);
      }
    },
    [pendingByUploadId, setPending],
  );

  return {
    canView,
    canExclude,
    canPromote,
    canRetry,
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
    refresh: async () => {
      // Live subscription owns refresh; manual refresh re-fetches enrichment only.
      enrichmentCacheRef.current.clear();
      setNotice("List updates live from Firestore.");
    },
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
          // Always persist an explicit boolean before promotion so false is not lost.
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
          if (result.enqueueQueued) {
            setNotice("Sent to AI Review. Open AI Processing to continue.");
          } else {
            setNotice(
              `Promoted to design ${result.designId}. AI enqueue: ${result.enqueueReason ?? "skipped"}. Open AI Processing to retry if needed.`,
            );
          }
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
        "Excluded from catalog. Artwork remains on the print request.",
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
        setNotice(value ? "Marked as halftone." : "Marked as not a halftone.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save Halftone decision.");
      }
    },
  };
}
