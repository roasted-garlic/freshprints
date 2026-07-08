export type FirebaseConnectionCheckKey = "app" | "auth" | "firestore" | "storage";
export type FirebaseConnectionStatus = "checking" | "connected" | "protected" | "failed";

export interface FirebaseConnectionCheck {
  key: FirebaseConnectionCheckKey;
  label: string;
  status: FirebaseConnectionStatus;
  message: string;
}

export interface FirebaseConnectionResult {
  status: FirebaseConnectionStatus;
  checks: FirebaseConnectionCheck[];
  checkedAt: Date;
}
