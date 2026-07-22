import { createHash } from "node:crypto";

export function createProofEmailJobId(requestId: string, proofId: string): string {
  const digest = createHash("sha256").update(`${requestId}\0${proofId}`).digest("hex");
  return `assisted-proof-${digest}`;
}

export function createCatalogShareEmailJobId(requestId: string, designId: string): string {
  const digest = createHash("sha256").update(`${requestId}\0catalog\0${designId}`).digest("hex");
  return `assisted-catalog-${digest}`;
}
