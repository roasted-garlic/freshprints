import { createHash } from "node:crypto";

export function createProofEmailJobId(requestId: string, proofRoundId: string): string {
  const digest = createHash("sha256")
    .update(`${requestId}\0proof-round\0${proofRoundId}`)
    .digest("hex");
  return `assisted-proof-${digest}`;
}

export function createCatalogShareEmailJobId(requestId: string, designId: string): string {
  const digest = createHash("sha256").update(`${requestId}\0catalog\0${designId}`).digest("hex");
  return `assisted-catalog-${digest}`;
}

export function createFinalArtworkEmailJobId(requestId: string, finalSourceId: string): string {
  const digest = createHash("sha256")
    .update(`${requestId}\0final\0${finalSourceId}`)
    .digest("hex");
  return `assisted-final-${digest}`;
}
