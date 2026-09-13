import type { DocumentSnapshot } from "firebase-admin/firestore";

export interface AssistedArtworkUploadLineage {
  assistedFinalSourceId: string | null;
  approvedProofId: string;
  hasFinalSource: boolean;
}

export interface AssistedArtworkUploadView {
  assistedFinalSourceId?: unknown;
  assistedProofId?: unknown;
  technicalStatus?: unknown;
  productionStoragePath?: unknown;
  updatedAt?: unknown;
}

/**
 * True when a customerUpload row still matches the assisted request's current artwork source.
 * Prevents reusing production output from a replaced Final Image or stale proof ingest.
 */
export function assistedUploadMatchesArtworkSource(
  upload: AssistedArtworkUploadView,
  lineage: AssistedArtworkUploadLineage,
): boolean {
  if (upload.technicalStatus !== "ready") {
    return false;
  }

  const productionPath =
    typeof upload.productionStoragePath === "string" ? upload.productionStoragePath.trim() : "";
  if (!productionPath) {
    return false;
  }

  if (lineage.hasFinalSource && lineage.assistedFinalSourceId) {
    const uploadFinalId =
      typeof upload.assistedFinalSourceId === "string" ? upload.assistedFinalSourceId.trim() : "";
    return uploadFinalId === lineage.assistedFinalSourceId;
  }

  const uploadProofId =
    typeof upload.assistedProofId === "string" ? upload.assistedProofId.trim() : "";
  return Boolean(lineage.approvedProofId && uploadProofId === lineage.approvedProofId);
}

function updatedAtMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const millis = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(millis) ? millis : 0;
  }
  return 0;
}

/**
 * Pick the newest ready upload for the same assisted artwork lineage, if any.
 */
export function selectReusableAssistedArtworkUpload(
  docs: DocumentSnapshot[],
  lineage: AssistedArtworkUploadLineage,
): DocumentSnapshot | null {
  let best: DocumentSnapshot | null = null;
  let bestUpdatedAt = -1;

  for (const docSnap of docs) {
    if (!docSnap.exists) {
      continue;
    }
    const upload = docSnap.data() ?? {};
    if (!assistedUploadMatchesArtworkSource(upload, lineage)) {
      continue;
    }
    const millis = updatedAtMillis(upload.updatedAt);
    if (millis >= bestUpdatedAt) {
      best = docSnap;
      bestUpdatedAt = millis;
    }
  }

  return best;
}
