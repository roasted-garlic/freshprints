import type {
  AssistedCreationComposition,
  AssistedCreationContainsText,
  AssistedCreationExactRequirement,
  AssistedCreationFlexibilityLevel,
  AssistedCreationPersonalizationType,
  AssistedCreationReferenceUsage,
  AssistedCreationRequestType,
  AssistedCreationStatus,
  AssistedCreationStylePreference,
  AssistedCreationTransitionActor,
} from "../../constants/assistedCreation/assistedCreation.constants";

export interface AssistedCreationAnswers {
  answersVersion: 1;
  rawDescription: string;
  requestType: AssistedCreationRequestType;
  containsText: AssistedCreationContainsText;
  exactText: string;
  textCapitalizationNotes: string;
  textPunctuationNotes: string;
  textLineBreaksExact: boolean;
  textLayoutFlexible: boolean;
  primarySubject: string;
  additionalSubjects: string;
  subjectAction: string;
  props: string;
  setting: string;
  occasion: string;
  audience: string;
  personalizationTypes: AssistedCreationPersonalizationType[];
  exactRequirements: AssistedCreationExactRequirement[];
  flexibilityLevel: AssistedCreationFlexibilityLevel;
  stylePreferences: AssistedCreationStylePreference[];
  mood: string;
  includedColors: string;
  excludedColors: string;
  garmentColor: string;
  composition: AssistedCreationComposition;
  hasReferences: boolean;
  referenceUsage: AssistedCreationReferenceUsage[];
}

export interface AssistedCreationReferenceImage {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Server Timestamp or ISO string in DTOs. */
  uploadedAt: unknown;
}

/**
 * How a proofs-array row was created.
 * Omit / `proof_image` = classic staff-uploaded proof image.
 * `catalog_share` = Design Library recommendation (ADR-FP-108 follow-up).
 */
export type AssistedCreationProofKind = "proof_image" | "catalog_share";

export interface AssistedCreationProof {
  id: string;
  /**
   * Omit or `proof_image` for classic uploads.
   * `catalog_share` rows are Design Library recommendations — not Storage proof PNGs.
   */
  kind?: AssistedCreationProofKind;
  /**
   * Assisted proof Storage path for image proofs.
   * Empty for `catalog_share` (never point at shared catalog derivatives — purge safety).
   */
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  note?: string;
  createdBy: string;
  /** Server Timestamp or ISO string in DTOs. */
  createdAt: unknown;
  /**
   * Set when the full-resolution Storage object was physically deleted
   * (sibling purge on approve, terminal purge, or 14-day expiry).
   * Not used for `catalog_share` rows.
   */
  fullSizePurgedAt?: unknown;
  /** Present when `kind === "catalog_share"`. */
  catalogDesignId?: string;
  /** Snapshot title at suggest time. */
  catalogDesignTitle?: string;
  /**
   * Catalog thumbnail/preview Storage path snapshot (not a signed URL).
   * Distinct from `storagePath` so purge never deletes catalog assets.
   */
  catalogPreviewImageUrl?: string;
}

export type AssistedCreationRevisionKind =
  | "status"
  | "request_update"
  | "customer_message"
  | "staff_message"
  | "proof_email_sent";

export interface AssistedCreationRevisionEntry {
  /** Server Timestamp or ISO string in DTOs. */
  at: unknown;
  byUid: string;
  byRole: AssistedCreationTransitionActor;
  note: string;
  fromStatus: AssistedCreationStatus | null;
  toStatus: AssistedCreationStatus;
  /** Structural event marker. Optional for legacy history entries. */
  kind?: AssistedCreationRevisionKind;
  /** Set when a proof-ready email delivery job successfully sends. */
  emailDeliveryJobId?: string;
}

export type AssistedCreationCustomerRating = 1 | 2 | 3 | 4 | 5;

/**
 * Staff-uploaded final high-resolution artwork after proof approval
 * (`final_source_needed` → `approved`). Separate from `proofs[]`.
 */
export interface AssistedCreationFinalSource {
  id: string;
  storagePath: string;
  /** Friendly basename used only for authorized customer downloads. */
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUid: string;
  /** Server Timestamp or ISO string in DTOs. */
  uploadedAt: unknown;
}

/**
 * How the customer is asked to review staff output.
 * Omitted / legacy docs behave as `proof_image`.
 */
export type AssistedCreationFulfillmentMode = "proof_image" | "catalog_share";

/** Ready catalog design offered instead of a custom proof image. */
export interface AssistedCreationSuggestedCatalogDesign {
  designId: string;
  /** Snapshot at suggest time for history / offline-ish UI. */
  title: string;
  /**
   * Catalog thumbnail or preview Storage path snapshot (not a signed URL).
   * Live UI may re-resolve from the ready design when available.
   */
  previewImageUrl?: string;
  /** Server Timestamp or ISO string in DTOs. */
  suggestedAt: unknown;
  suggestedByUid: string;
}

export interface AssistedCreationRequest {
  id: string;
  schemaVersion: 1;
  customerId: string;
  customerUid: string;
  status: AssistedCreationStatus;
  answers: AssistedCreationAnswers;
  referenceImages: AssistedCreationReferenceImage[];
  proofs: AssistedCreationProof[];
  revisionHistory: AssistedCreationRevisionEntry[];
  staffNotes?: string;
  /**
   * Set when the customer cancels via Portal (`cancelAssistedCreationRequest`).
   * Absent on legacy cancels and staff-cancelled requests.
   */
  customerCancelReason?: string;
  /** Set when the customer approves a proof with an optional 1–5 rating. */
  customerRating?: AssistedCreationCustomerRating;
  /** Optional short note sent with proof approval. */
  customerApprovalNote?: string;
  /** Proof id approved by the customer (latest proof at approve time). */
  approvedProofId?: string;
  /**
   * Final HR artwork after `final_source_needed` (proof_image path).
   * Absent on catalog_share completions and legacy approvals.
   */
  finalSource?: AssistedCreationFinalSource | null;
  /**
   * How the customer reviews staff output. Omit = proof_image for legacy docs.
   * Mutually exclusive attach: proof upload clears catalog suggestion and vice versa.
   */
  fulfillmentMode?: AssistedCreationFulfillmentMode;
  /** Ready catalog design offered instead of a custom proof (catalog_share mode). */
  suggestedCatalogDesign?: AssistedCreationSuggestedCatalogDesign | null;
  /** Set when the customer approves a catalog_share suggestion. */
  approvedCatalogDesignId?: string;
  /** Server Timestamp when the customer approved; starts the 14-day download window. */
  approvedAt?: unknown;
  /**
   * Set when the customer adds the approved proof to Current Request / Your Stash
   * (server-copied into customer-upload storage). Survives assisted 14-day proof purge.
   * Not used for catalog_share approvals (Add to Request uses catalog attach).
   */
  printRequestIngest?: AssistedCreationPrintRequestIngest | null;
  /** Server Timestamp or ISO string in DTOs. */
  createdAt: unknown;
  /** Server Timestamp or ISO string in DTOs. */
  updatedAt: unknown;
}

/** Denormalized Stash ingest pointer for Approved Design CTA / idempotency. */
export interface AssistedCreationPrintRequestIngest {
  customerUploadId: string;
  printRequestItemId: string;
  printRequestId: string;
  assistedProofId: string;
  /** Server Timestamp or ISO string in DTOs. */
  ingestedAt: unknown;
  /**
   * Consent captured at first Add to Request (Design Library consideration).
   * Optional on legacy ingest docs written before this field existed.
   */
  catalogUseAcknowledged?: boolean;
}
