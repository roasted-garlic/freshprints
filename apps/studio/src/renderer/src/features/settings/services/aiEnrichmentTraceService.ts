import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import type { AiEnrichmentTrace } from "@fresh-prints/shared/types/ai/aiEnrichmentTrace.types";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

export const aiEnrichmentTraceService = {
  list() {
    return callTracedFunction<Record<string, never>, AiEnrichmentTrace[]>("listAiEnrichmentTraces", { source: "aiEnrichmentTraceService.list" })({});
  },
  clear(traceIds: string[]) {
    return callTracedFunction<{ traceIds: string[] }, { cleared: number }>("clearAiEnrichmentTraces", { source: "aiEnrichmentTraceService.clear" })({ traceIds });
  },
  subscribeList(onChange: (traces: AiEnrichmentTrace[]) => void, onError?: (error: Error) => void) {
    return onSnapshot(query(collection(db, "aiEnrichmentTraces"), orderBy("startedAt", "desc")), (snapshot) => onChange(snapshot.docs.slice(0, 50).map((entry) => entry.data() as AiEnrichmentTrace)), (error) => onError?.(error));
  },
  get(traceId: string) {
    return callTracedFunction<{ traceId: string }, AiEnrichmentTrace>("getAiEnrichmentTrace", { source: "aiEnrichmentTraceService.get" })({ traceId });
  },
  subscribe(traceId: string, onChange: (trace: AiEnrichmentTrace | null) => void, onError?: (error: Error) => void) {
    return onSnapshot(doc(db, "aiEnrichmentTraces", traceId), (snapshot) => onChange(snapshot.exists() ? snapshot.data() as AiEnrichmentTrace : null), (error) => onError?.(error));
  },
};
