/**
 * Staff proof Storage object + download basename.
 *
 * Pattern: `proof-{n}-{mmddyyyy}-{HHmm}.{ext}`
 * Example: `proof-6-10172026-2204.png`
 *
 * - `{n}` — chronological proof number on the request (1 = first uploaded)
 * - `{mmddyyyy}` / `{HHmm}` — local wall-clock at Studio upload (no seconds)
 * - `{ext}` — `png` | `jpg` | `webp` from content type (fallback: original name)
 *
 * Storage path: `assisted-creation/{customerUid}/{requestId}/proofs/{fileName}`
 * Firestore `proof.id` remains a UUID; `proof.fileName` matches the object basename.
 */

const STORED_PROOF_FILE_NAME_RE = /^proof-\d+-\d{8}-\d{4}\.(png|jpg|webp)$/i;

export function isAssistedCreationStoredProofFileName(fileName: string | null | undefined): boolean {
  return STORED_PROOF_FILE_NAME_RE.test((fileName ?? "").trim());
}

export function assistedCreationProofFileExtension(
  contentType: string | null | undefined,
  originalFileName?: string | null,
): string {
  const type = (contentType ?? "").trim().toLowerCase();
  if (type === "image/png") {
    return "png";
  }
  if (type === "image/jpeg") {
    return "jpg";
  }
  if (type === "image/webp") {
    return "webp";
  }
  const fromName = (originalFileName ?? "").trim().split(".").pop()?.toLowerCase() ?? "";
  if (fromName === "png" || fromName === "jpg" || fromName === "webp") {
    return fromName;
  }
  if (fromName === "jpeg") {
    return "jpg";
  }
  return "png";
}

/** Local calendar stamp parts for proof rename (no seconds). */
export function formatAssistedCreationProofUploadStamp(date: Date): {
  datePart: string;
  timePart: string;
} {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const HH = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return { datePart: `${mm}${dd}${yyyy}`, timePart: `${HH}${min}` };
}

export function buildAssistedCreationProofStoredFileName(input: {
  proofNumber: number;
  uploadedAt?: Date;
  contentType?: string | null;
  originalFileName?: string | null;
}): string {
  const n = Number.isFinite(input.proofNumber) ? Math.max(1, Math.floor(input.proofNumber)) : 1;
  const at = input.uploadedAt ?? new Date();
  const { datePart, timePart } = formatAssistedCreationProofUploadStamp(at);
  const ext = assistedCreationProofFileExtension(input.contentType, input.originalFileName);
  return `proof-${n}-${datePart}-${timePart}.${ext}`;
}

/**
 * Browser download basename for Portal customers.
 * Prefer the staff rename pattern; never fall back to a legacy creative/original name.
 */
export function buildAssistedCreationCustomerDownloadFileName(input: {
  proofNumber: number;
  fileName?: string | null;
  contentType?: string | null;
}): string {
  const stored = input.fileName?.trim() ?? "";
  if (isAssistedCreationStoredProofFileName(stored)) {
    return stored;
  }
  const ext = assistedCreationProofFileExtension(input.contentType, stored);
  const n = Number.isFinite(input.proofNumber) ? Math.max(1, Math.floor(input.proofNumber)) : 1;
  return `proof-${n}.${ext}`;
}
