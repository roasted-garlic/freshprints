/**
 * Staff proof Storage object + download basename.
 *
 * **New uploads (opaque):** Storage object id is a cryptographically random UUID
 * with no extension (`buildAssistedCreationOpaqueProofObjectId`). Firestore
 * `proof.fileName` stores the same opaque id; content type is set on the object.
 *
 * **Legacy pattern (still readable):** `proof-{n}-{mmddyyyy}-{HHmm}.{ext}`
 * Example: `proof-6-10172026-2204.png`
 *
 * Storage path: `assisted-creation/{customerUid}/{requestId}/proofs/{objectId}`
 * Firestore `proof.id` remains a UUID; new uploads use opaque object basenames.
 */

const STORED_PROOF_FILE_NAME_RE = /^proof-\d+-\d{8}-\d{4}\.(png|jpg|webp)$/i;
const OPAQUE_PROOF_OBJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAssistedCreationStoredProofFileName(fileName: string | null | undefined): boolean {
  return STORED_PROOF_FILE_NAME_RE.test((fileName ?? "").trim());
}

/** True when the Storage basename looks like an opaque UUID object id (no extension). */
export function isAssistedCreationOpaqueProofObjectId(fileName: string | null | undefined): boolean {
  return OPAQUE_PROOF_OBJECT_ID_RE.test((fileName ?? "").trim());
}

/**
 * Cryptographically opaque Storage object id for new proof uploads (no extension).
 * Uses `crypto.randomUUID` when available.
 */
export function buildAssistedCreationOpaqueProofObjectId(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  return randomUuid().trim().toLowerCase();
}

/**
 * Friendly download basename for final artwork (authorized download only).
 * Never used as the Storage object key.
 */
export function buildAssistedCreationFinalArtworkDownloadFileName(
  contentType?: string | null,
): string {
  const ext = assistedCreationProofFileExtension(contentType);
  return `Fresh-Prints-Final-Artwork.${ext}`;
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
