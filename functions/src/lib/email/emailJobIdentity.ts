import { createHash } from "node:crypto";

export function createProofEmailJobId(requestId: string, proofId: string): string {
  const digest = createHash("sha256").update(`${requestId}\0${proofId}`).digest("hex");
  return `assisted-proof-${digest}`;
}
