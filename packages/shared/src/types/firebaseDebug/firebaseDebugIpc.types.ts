import type { FirestoreTraceSnapshot } from "../../utils/firestoreUsageTrace";

export interface OpenFirebaseDebugWindowRequest {
  projectId: string;
}

export type FirebaseDebugCommand =
  | { kind: "reset" }
  | { kind: "setTracingEnabled"; enabled: boolean };

export interface FreshPrintsFirebaseDebugApi {
  open(request: OpenFirebaseDebugWindowRequest): Promise<{ opened: boolean }>;
  publishSnapshot(snapshot: FirestoreTraceSnapshot): void;
  getSnapshot(): Promise<FirestoreTraceSnapshot | null>;
  onSnapshot(callback: (snapshot: FirestoreTraceSnapshot) => void): () => void;
  onCommand(callback: (command: FirebaseDebugCommand) => void): () => void;
  sendCommand(command: FirebaseDebugCommand): void;
  close(): void;
}
