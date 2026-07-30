import { httpsCallable, type Functions } from "firebase/functions";

import { runTracedCallable, type FirestoreTraceMetadata } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { functions } from "./firebase";

/**
 * Drop-in replacement for `httpsCallable(functions, name)` that also records the invocation in the
 * Firebase Debug panel tracer. Every Studio service should call this instead of `httpsCallable`
 * directly so callable activity is centrally attributed without each service hand-rolling trace
 * calls (see `09-coding-standards.md`: tracing lives in the service layer, not components).
 */
export function callTracedFunction<Request, Response>(
  callableName: string,
  metadata: FirestoreTraceMetadata = {},
  functionsInstance: Functions = functions,
): (request?: Request) => Promise<Response> {
  return (request?: Request) =>
    runTracedCallable<Request, Response>(
      callableName,
      (req) => httpsCallable<Request, Response>(functionsInstance, callableName)(req),
      request,
      { app: "studio", ...metadata },
    );
}
