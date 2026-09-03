import {
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

import type {
  CustomerUploadCatalogReviewStatus,
  CustomerUploadPurpose,
  CustomerUploadSourceFormat,
  CustomerUploadTechnicalStatus,
} from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";
import type {
  ExcludeCustomerUploadFromCatalogResponse,
  PromoteCustomerUploadToAiReviewResponse,
  RestoreCustomerUploadCatalogEligibilityResponse,
  RetryCustomerUploadProcessingResponse,
} from "@fresh-prints/shared/types/customerUpload/customerUploadStaffActions.types";
import type { ArtworkBackgroundSource } from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import { resolveCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

import { db, storage } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import {
  buildPurposeScopedIntakeQuery,
  type CustomerUploadIntakeFilter,
} from "../utils/customerUploadIntakeQueries";

export type { CustomerUploadIntakeFilter };
export interface CustomerUploadIntakeRow {
  id: string;
  batchId: string;
  customerUid: string;
  customerId: string;
  customerDisplayName: string;
  printRequestId: string | null;
  printRequestName: string | null;
  printRequestStatus: string | null;
  printRequestQueueTab: string | null;
  printRequestIsInternal: boolean | null;
  printRequestItemCount: number | null;
  printRequestUpdatedAtMs: number | null;
  showAssignmentLabel: string | null;
  originalFilename: string;
  sourceFormat: CustomerUploadSourceFormat | null;
  productionStoragePath: string | null;
  previewStoragePath: string | null;
  thumbnailStoragePath: string | null;
  previewUrl: string | null;
  widthPx: number | null;
  heightPx: number | null;
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  printWidthInches: number | null;
  printHeightInches: number | null;
  effectiveDpi: number | null;
  transparencyPassed: boolean | null;
  technicalStatus: CustomerUploadTechnicalStatus;
  technicalFailureCode: string | null;
  technicalFailureMessage: string | null;
  catalogReviewStatus: CustomerUploadCatalogReviewStatus;
  promotedDesignId: string | null;
  ownershipConfirmed: boolean;
  /** `null` when field missing on older docs (Studio shows Pending). */
  catalogUseAcknowledged: boolean | null;
  purpose: CustomerUploadPurpose;
  createdAtMs: number | null;
  /** Set when exclude purged donation full-size files (thumbnail kept). */
  fullSizePurgedAtMs: number | null;
  approvedMaxPrintWidthInches: number | null;
  approvedMaxPrintHeightInches: number | null;
  wasUpscaled: boolean | null;
  upscaleFactor: number | null;
  sizingWarningCode: string | null;
  halftoneDetection: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneDetectionPersisted | null;
  halftoneSubmitterResponse: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneSubmitterResponsePersisted | null;
  halftoneStaffDecision: import("@fresh-prints/shared/types/halftone/halftone.types").HalftoneStaffDecisionPersisted | null;
  /** Artwork background hex for intake/review display mat (staff override). */
  artworkBackgroundHex: string | null;
  /** Source of artwork background decision. */
  artworkBackgroundSource: import("@fresh-prints/shared/types/design/artworkBackgroundSource.types").ArtworkBackgroundSource | null;
  /** Set when upload was server-copied from Assisted approved proof (ADR-FP-094). */
  assistedCreationRequestId: string | null;
  assistedProofId: string | null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
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

async function resolvePreviewUrl(path: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }
  try {
    return await getDownloadURL(ref(storage, path.replace(/^\//, "")));
  } catch {
    return null;
  }
}

export const customerUploadIntakeService = {
  async enrichRowLookups(input: {
    customerId: string;
    printRequestId: string | null;
    previewStoragePath: string | null;
  }): Promise<{
    customerDisplayName: string;
    printRequestName: string | null;
    printRequestStatus: string | null;
    printRequestQueueTab: string | null;
    printRequestIsInternal: boolean | null;
    printRequestItemCount: number | null;
    printRequestUpdatedAtMs: number | null;
    previewUrl: string | null;
  }> {
    const resolveCustomer = async (): Promise<string> => {
      let customerDisplayName = input.customerId || "Customer";
      if (!input.customerId) {
        return customerDisplayName;
      }
      const customerSnap = await getDoc(doc(db, "customers", input.customerId));
      if (customerSnap.exists()) {
        const customer = customerSnap.data();
        customerDisplayName =
          asString(customer.displayName) ??
          asString(customer.username) ??
          customerDisplayName;
      }
      return customerDisplayName;
    };

    const resolvePrintRequest = async (): Promise<{
      printRequestName: string | null;
      printRequestStatus: string | null;
      printRequestQueueTab: string | null;
      printRequestIsInternal: boolean | null;
      printRequestItemCount: number | null;
      printRequestUpdatedAtMs: number | null;
    }> => {
      if (!input.printRequestId) {
        return {
          printRequestName: null,
          printRequestStatus: null,
          printRequestQueueTab: null,
          printRequestIsInternal: null,
          printRequestItemCount: null,
          printRequestUpdatedAtMs: null,
        };
      }
      const requestSnap = await getDoc(doc(db, "printRequests", input.printRequestId));
      if (!requestSnap.exists()) {
        return {
          printRequestName: null,
          printRequestStatus: null,
          printRequestQueueTab: null,
          printRequestIsInternal: null,
          printRequestItemCount: null,
          printRequestUpdatedAtMs: null,
        };
      }
      const request = requestSnap.data();
      return {
        printRequestName: asString(request.name),
        printRequestStatus: asString(request.status),
        printRequestQueueTab: asString(request.queueTab),
        printRequestIsInternal:
          typeof request.isInternal === "boolean" ? request.isInternal : null,
        printRequestItemCount:
          typeof request.itemCount === "number" && Number.isFinite(request.itemCount)
            ? request.itemCount
            : null,
        printRequestUpdatedAtMs: timestampMs(request.updatedAt),
      };
    };

    const [customerDisplayName, printRequest, previewUrl] = await Promise.all([
      resolveCustomer(),
      resolvePrintRequest(),
      resolvePreviewUrl(input.previewStoragePath),
    ]);

    return {
      customerDisplayName,
      printRequestName: printRequest.printRequestName,
      printRequestStatus: printRequest.printRequestStatus,
      printRequestQueueTab: printRequest.printRequestQueueTab,
      printRequestIsInternal: printRequest.printRequestIsInternal,
      printRequestItemCount: printRequest.printRequestItemCount,
      printRequestUpdatedAtMs: printRequest.printRequestUpdatedAtMs,
      previewUrl,
    };
  },

  async listForIntake(
    caller: User,
    filter: CustomerUploadIntakeFilter,
    purposeScope: CustomerUploadPurpose = "print_request",
  ): Promise<CustomerUploadIntakeRow[]> {
    if (!permissionService.canViewCustomerUploadIntake(caller)) {
      throw new Error("You do not have permission to view customer upload intake.");
    }

    const uploadsQuery = buildPurposeScopedIntakeQuery(db, {
      purpose: purposeScope,
      catalogReviewStatus: filter,
    });

    const snapshot = await getDocs(uploadsQuery);
    const rows: CustomerUploadIntakeRow[] = [];

    for (const uploadDoc of snapshot.docs) {
      const data = uploadDoc.data();
      const customerId = asString(data.customerId) ?? "";
      const printRequestId = asString(data.printRequestId);
      const previewStoragePath = asString(data.previewStoragePath) ?? asString(data.thumbnailStoragePath);

      let customerDisplayName = customerId || "Customer";
      if (customerId) {
        const customerSnap = await getDoc(doc(db, "customers", customerId));
        if (customerSnap.exists()) {
          const customer = customerSnap.data();
          customerDisplayName =
            asString(customer.displayName) ??
            asString(customer.username) ??
            customerDisplayName;
        }
      }

      let printRequestName: string | null = null;
      let printRequestStatus: string | null = null;
      if (printRequestId) {
        const requestSnap = await getDoc(doc(db, "printRequests", printRequestId));
        if (requestSnap.exists()) {
          const request = requestSnap.data();
          printRequestName = asString(request.name);
          printRequestStatus = asString(request.status);
        }
      }

      rows.push({
        id: uploadDoc.id,
        batchId: asString(data.batchId) ?? "",
        customerUid: asString(data.customerUid) ?? "",
        customerId,
        customerDisplayName,
        printRequestId,
        printRequestName,
        printRequestStatus,
        printRequestQueueTab: null,
        printRequestIsInternal: null,
        printRequestItemCount: null,
        printRequestUpdatedAtMs: null,
        showAssignmentLabel: null,
        originalFilename: asString(data.originalFilename) ?? "Uploaded artwork",
        sourceFormat: (asString(data.sourceFormat) as CustomerUploadSourceFormat | null) ?? null,
        productionStoragePath: asString(data.productionStoragePath),
        previewStoragePath: asString(data.previewStoragePath),
        thumbnailStoragePath: asString(data.thumbnailStoragePath),
        previewUrl: await resolvePreviewUrl(previewStoragePath),
        widthPx: asNumber(data.widthPx),
        heightPx: asNumber(data.heightPx),
        sourceWidthPx: asNumber(data.sourceWidthPx),
        sourceHeightPx: asNumber(data.sourceHeightPx),
        printWidthInches: asNumber(data.printWidthInches),
        printHeightInches: asNumber(data.printHeightInches),
        effectiveDpi: asNumber(data.effectiveDpi),
        transparencyPassed: asBool(data.transparencyPassed),
        technicalStatus: data.technicalStatus as CustomerUploadTechnicalStatus,
        technicalFailureCode: asString(data.technicalFailureCode),
        technicalFailureMessage: asString(data.technicalFailureMessage),
        catalogReviewStatus: data.catalogReviewStatus as CustomerUploadCatalogReviewStatus,
        promotedDesignId: asString(data.promotedDesignId),
        ownershipConfirmed: data.ownershipConfirmed === true,
        catalogUseAcknowledged:
          typeof data.catalogUseAcknowledged === "boolean"
            ? data.catalogUseAcknowledged
            : null,
        purpose: resolveCustomerUploadPurpose(data.purpose),
        createdAtMs: timestampMs(data.createdAt),
        fullSizePurgedAtMs: timestampMs(data.fullSizePurgedAt),
        approvedMaxPrintWidthInches: asNumber(data.approvedMaxPrintWidthInches),
        approvedMaxPrintHeightInches: asNumber(data.approvedMaxPrintHeightInches),
        wasUpscaled: asBool(data.wasUpscaled),
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
        assistedCreationRequestId: asString(data.assistedCreationRequestId),
        assistedProofId: asString(data.assistedProofId),
      });
    }

    return rows;
  },

  async promote(uploadId: string): Promise<PromoteCustomerUploadToAiReviewResponse> {
    return callTracedFunction<{ uploadId: string }, PromoteCustomerUploadToAiReviewResponse>(
      "promoteCustomerUploadToAiReview",
      { source: "customerUploadIntakeService.promote" },
    )({ uploadId });
  },

  async exclude(uploadId: string): Promise<ExcludeCustomerUploadFromCatalogResponse> {
    return callTracedFunction<{ uploadId: string }, ExcludeCustomerUploadFromCatalogResponse>(
      "excludeCustomerUploadFromCatalog",
      { source: "customerUploadIntakeService.exclude" },
    )({ uploadId });
  },

  async restore(uploadId: string): Promise<RestoreCustomerUploadCatalogEligibilityResponse> {
    return callTracedFunction<
      { uploadId: string },
      RestoreCustomerUploadCatalogEligibilityResponse
    >("restoreCustomerUploadCatalogEligibility", {
      source: "customerUploadIntakeService.restore",
    })({ uploadId });
  },

  async retry(uploadId: string): Promise<RetryCustomerUploadProcessingResponse> {
    return callTracedFunction<{ uploadId: string }, RetryCustomerUploadProcessingResponse>(
      "retryCustomerUploadProcessing",
      { source: "customerUploadIntakeService.retry" },
    )({ uploadId });
  },

  async recordHalftoneStaffDecision(
    uploadId: string,
    value: boolean,
  ): Promise<{ uploadId: string; value: boolean }> {
    return callTracedFunction<
      { uploadId: string; value: boolean },
      { uploadId: string; value: boolean }
    >("recordCustomerUploadHalftoneStaffDecision", {
      source: "customerUploadIntakeService.recordHalftoneStaffDecision",
    })({ uploadId, value });
  },

  async recordArtworkBackgroundStaffDecision(
    uploadId: string,
    artworkBackgroundHex: string | null,
    options?: { clearArtworkBackground?: boolean },
  ): Promise<{
    uploadId: string;
    artworkBackgroundHex: string | null;
    artworkBackgroundSource: ArtworkBackgroundSource | null;
  }> {
    return callTracedFunction<
      {
        uploadId: string;
        artworkBackgroundHex: string | null;
        clearArtworkBackground?: boolean;
      },
      {
        uploadId: string;
        artworkBackgroundHex: string | null;
        artworkBackgroundSource: ArtworkBackgroundSource | null;
      }
    >("recordCustomerUploadArtworkBackgroundStaffDecision", {
      source: "customerUploadIntakeService.recordArtworkBackgroundStaffDecision",
    })({
      uploadId,
      artworkBackgroundHex,
      clearArtworkBackground: options?.clearArtworkBackground === true,
    });
  },
};
