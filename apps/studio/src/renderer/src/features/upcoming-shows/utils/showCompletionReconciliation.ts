export type ShowCompletionReconciliationPhase =
  | "request_read"
  | "item_read"
  | "allocation_read"
  | "eligibility"
  | "request_write"
  | "committed";

export interface ReconciliationRequest {
  status: string;
  parserStatus?: "compatible" | "incompatible";
  missingFields?: readonly string[];
  legacyExtraFields?: readonly string[];
}

export interface ReconciliationItem {
  quantity: number;
}

export interface ReconciliationAllocation {
  status: string;
  allocatedQuantity: number;
}

export interface ShowCompletionReconciliationResult {
  printRequestId: string;
  outcome: "already_terminal" | "not_eligible" | "completed" | "needs_remediation" | "failed";
  phase: ShowCompletionReconciliationPhase;
  parserStatus: "compatible" | "incompatible" | "unknown";
  missingFields: string[];
  legacyExtraFields: string[];
  /**
   * Named cross-field assignment invariant firestore.rules would reject this document for (Plan
   * Section 29.3) — e.g. "both_customer_and_guest_id_present" — or `null` when not applicable/not
   * evaluated. Read-only diagnostic only.
   */
  assignmentInvariantFailure?: string | null;
  currentStatus?: string;
  proposedStatus: "completed";
  writeRequired: boolean;
  firebaseErrorCode?: string;
  success: boolean;
  commitment: "not_committed" | "committed";
  retryEligible: boolean;
  diagnosticCode: string;
}

export class ShowCompletionReconciliationRemediationError extends Error {
  constructor(
    message: string,
    readonly diagnostics: {
      missingFields?: readonly string[];
      legacyExtraFields?: readonly string[];
      /**
       * Named cross-field assignment invariant Rules would reject this document for (Plan Section
       * 29.3), or `null`/absent when the assignment is valid. Read-only diagnostic only — does not
       * itself change any write, permission, or behavior.
       */
      assignmentInvariantFailure?: string | null;
    } = {},
  ) {
    super(message);
    this.name = "ShowCompletionReconciliationRemediationError";
  }
}

interface ReconciliationDependencies {
  readRequest: () => Promise<ReconciliationRequest>;
  readItems: () => Promise<readonly ReconciliationItem[]>;
  readAllocations: () => Promise<readonly ReconciliationAllocation[]>;
  writeCompleted: () => Promise<void>;
  isPrintedStatus: (status: string) => boolean;
}

async function runPhase<T>(
  phase: ShowCompletionReconciliationPhase,
  operation: () => Promise<T>,
): Promise<{ value: T } | { failure: ShowCompletionReconciliationResult }> {
  try {
    return { value: await operation() };
  } catch (error) {
    return {
      failure: {
        printRequestId: "",
        outcome:
          error instanceof ShowCompletionReconciliationRemediationError
            ? "needs_remediation"
            : "failed",
        phase,
        parserStatus:
          error instanceof ShowCompletionReconciliationRemediationError
            ? "incompatible"
            : "unknown",
        missingFields:
          error instanceof ShowCompletionReconciliationRemediationError
            ? [...(error.diagnostics.missingFields ?? [])]
            : [],
        legacyExtraFields:
          error instanceof ShowCompletionReconciliationRemediationError
            ? [...(error.diagnostics.legacyExtraFields ?? [])]
            : [],
        assignmentInvariantFailure:
          error instanceof ShowCompletionReconciliationRemediationError
            ? error.diagnostics.assignmentInvariantFailure ?? null
            : null,
        proposedStatus: "completed",
        writeRequired: phase === "request_write",
        firebaseErrorCode:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : undefined,
        success: false,
        commitment: "not_committed",
        retryEligible: !(error instanceof ShowCompletionReconciliationRemediationError),
        diagnosticCode:
          error instanceof ShowCompletionReconciliationRemediationError
            ? "record_needs_remediation"
            : `${phase}_failed`,
      },
    };
  }
}

export async function reconcileCompletedPrintRequest(
  printRequestId: string,
  dependencies: ReconciliationDependencies,
): Promise<ShowCompletionReconciliationResult> {
  const requestResult = await runPhase("request_read", dependencies.readRequest);
  if ("failure" in requestResult) return { ...requestResult.failure, printRequestId };
  const requestManifest = {
    parserStatus: requestResult.value.parserStatus ?? "compatible" as const,
    missingFields: [...(requestResult.value.missingFields ?? [])],
    legacyExtraFields: [...(requestResult.value.legacyExtraFields ?? [])],
    currentStatus: requestResult.value.status,
    proposedStatus: "completed" as const,
  };
  const withRequestManifest = (
    failure: ShowCompletionReconciliationResult,
  ): ShowCompletionReconciliationResult => ({
    ...failure,
    ...requestManifest,
    parserStatus:
      failure.parserStatus === "incompatible" ? "incompatible" : requestManifest.parserStatus,
    missingFields: [...new Set([...requestManifest.missingFields, ...failure.missingFields])],
    legacyExtraFields: [
      ...new Set([...requestManifest.legacyExtraFields, ...failure.legacyExtraFields]),
    ],
    printRequestId,
  });

  const itemResult = await runPhase("item_read", dependencies.readItems);
  if ("failure" in itemResult) return withRequestManifest(itemResult.failure);

  const allocationResult = await runPhase("allocation_read", dependencies.readAllocations);
  if ("failure" in allocationResult) {
    return withRequestManifest(allocationResult.failure);
  }

  if (requestResult.value.status === "completed" || requestResult.value.status === "archived") {
    return {
      printRequestId, outcome: "already_terminal", phase: "eligibility", ...requestManifest,
      writeRequired: false, success: true, commitment: "not_committed", retryEligible: false,
      diagnosticCode: "already_terminal",
    };
  }

  const totalRequestedQuantity = itemResult.value.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrintedQuantity = allocationResult.value
    .filter((allocation) => allocation.status !== "canceled")
    .filter((allocation) => dependencies.isPrintedStatus(allocation.status))
    .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);

  if (totalRequestedQuantity <= 0 || totalPrintedQuantity < totalRequestedQuantity) {
    return {
      printRequestId, outcome: "not_eligible", phase: "eligibility", ...requestManifest,
      writeRequired: false, success: true, commitment: "not_committed", retryEligible: false,
      diagnosticCode: "not_fully_printed",
    };
  }

  const writeResult = await runPhase("request_write", dependencies.writeCompleted);
  if ("failure" in writeResult) {
    return { ...withRequestManifest(writeResult.failure), writeRequired: true };
  }

  return {
    printRequestId, outcome: "completed", phase: "committed", ...requestManifest,
    writeRequired: true, success: true, commitment: "committed", retryEligible: false,
    diagnosticCode: "completion_committed",
  };
}

export function summarizeShowCompletionReconciliation(
  results: readonly ShowCompletionReconciliationResult[],
): { failedRequestIds: string[]; remediationRequestIds: string[] } {
  return {
    failedRequestIds: results
      .filter((result) => result.outcome === "failed" && result.retryEligible)
      .map((result) => result.printRequestId),
    remediationRequestIds: results
      .filter((result) => result.outcome === "needs_remediation")
      .map((result) => result.printRequestId),
  };
}
