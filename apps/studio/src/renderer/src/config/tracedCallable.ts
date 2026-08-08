import { httpsCallable, type Functions, type HttpsCallableOptions } from "firebase/functions";

import { runTracedCallable, type FirestoreTraceMetadata } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { functions } from "./firebase";

/**
 * Drop-in replacement for `httpsCallable(functions, name)` that also records the invocation in the
 * Firebase Debug panel tracer. Every Studio service should call this instead of `httpsCallable`
 * directly so callable activity is centrally attributed without each service hand-rolling trace
 * calls (see `09-coding-standards.md`: tracing lives in the service layer, not components).
 *
 * `callableOptions.timeout` lets a caller override the Firebase JS SDK's 70-second default
 * (`node_modules/@firebase/functions/dist/index.cjs.js`: "Default timeout to 70s, but let the
 * options override it.") — required for any callable whose own server-side `timeoutSeconds`
 * genuinely exceeds 70s, so the client does not give up on a call the server is still correctly
 * processing (post-launch-catalog-and-processing-stability, Owner QA Amendment 5). Omitting this
 * option preserves the SDK default exactly, so existing callers are unaffected.
 */
export function callTracedFunction<Request, Response>(
  callableName: string,
  metadata: FirestoreTraceMetadata = {},
  functionsInstance: Functions = functions,
  callableOptions?: HttpsCallableOptions,
): (request?: Request) => Promise<Response> {
  return (request?: Request) =>
    runTracedCallable<Request, Response>(
      callableName,
      (req) => httpsCallable<Request, Response>(functionsInstance, callableName, callableOptions)(req),
      request,
      { app: "studio", ...metadata },
    );
}
