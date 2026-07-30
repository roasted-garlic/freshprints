import {
  summarizeShowCompletionReconciliation,
  type ShowCompletionReconciliationResult,
} from "./showCompletionReconciliation";

export interface CommittedVerificationResult {
  results: ShowCompletionReconciliationResult[];
  candidateRequestIds: string[];
  failedRequestIds: string[];
  remediationRequestIds: string[];
}

function isTimestampSettlementCandidate(
  result: ShowCompletionReconciliationResult,
): boolean {
  return result.outcome === "needs_remediation"
    && result.phase === "allocation_read"
    && result.missingFields.length === 1
    && result.missingFields[0] === "updatedAt";
}

/**
 * One authoritative, bounded pass for only provisional retryable failures.
 * The explicit `"server"` argument prevents callers/tests from accidentally substituting the
 * default Firestore read source at this orchestration boundary.
 */
export async function verifyFailedReconciliationWithCommittedState(
  provisionalResults: readonly ShowCompletionReconciliationResult[],
  verifyOne: (
    printRequestId: string,
    readSource: "server",
  ) => Promise<ShowCompletionReconciliationResult>,
): Promise<CommittedVerificationResult> {
  const provisionalSummary = summarizeShowCompletionReconciliation(provisionalResults);
  const candidateRequestIds = [
    ...new Set([
      ...provisionalSummary.failedRequestIds,
      ...provisionalResults
        .filter(isTimestampSettlementCandidate)
        .map((result) => result.printRequestId),
    ]),
  ];
  if (candidateRequestIds.length === 0) {
    return {
      results: [...provisionalResults],
      candidateRequestIds,
      ...provisionalSummary,
    };
  }

  const verifiedResults = await Promise.all(
    candidateRequestIds.map((printRequestId) => verifyOne(printRequestId, "server")),
  );
  const verifiedById = new Map(
    verifiedResults.map((result) => [result.printRequestId, result]),
  );
  const results = provisionalResults.map(
    (result) => verifiedById.get(result.printRequestId) ?? result,
  );

  return {
    results,
    candidateRequestIds,
    ...summarizeShowCompletionReconciliation(results),
  };
}

/**
 * Production-used Finish orchestration seam: ordinary first pass followed by exactly one committed
 * pass for retryable failures or the one mapper shape that can represent an unresolved
 * `serverTimestamp()` (`allocation_read`, only `updatedAt` missing).
 */
export async function reconcileShowCompletionWithCommittedVerification(
  affectedPrintRequestIds: readonly string[],
  reconcileOne: (
    printRequestId: string,
    readSource: "default" | "server",
  ) => Promise<ShowCompletionReconciliationResult>,
): Promise<CommittedVerificationResult & {
  provisionalResults: ShowCompletionReconciliationResult[];
}> {
  const uniqueIds = [...new Set(affectedPrintRequestIds)];
  const provisionalResults = await Promise.all(
    uniqueIds.map((printRequestId) => reconcileOne(printRequestId, "default")),
  );
  return {
    provisionalResults,
    ...await verifyFailedReconciliationWithCommittedState(
      provisionalResults,
      reconcileOne,
    ),
  };
}
