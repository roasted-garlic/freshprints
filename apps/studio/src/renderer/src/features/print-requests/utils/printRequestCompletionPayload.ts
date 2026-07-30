import { serverTimestamp } from "firebase/firestore";

/** Exact least-privilege patch for the post-Finish request transition. */
export function buildPrintRequestCompletionPayload(
  callerUid: string,
  timestampFactory: typeof serverTimestamp = serverTimestamp,
) {
  return {
    status: "completed" as const,
    updatedBy: callerUid,
    updatedAt: timestampFactory(),
  };
}
