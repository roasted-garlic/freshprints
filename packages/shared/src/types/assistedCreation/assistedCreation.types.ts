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

export interface AssistedCreationProof {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  note?: string;
  createdBy: string;
  /** Server Timestamp or ISO string in DTOs. */
  createdAt: unknown;
}

export interface AssistedCreationRevisionEntry {
  /** Server Timestamp or ISO string in DTOs. */
  at: unknown;
  byUid: string;
  byRole: AssistedCreationTransitionActor;
  note: string;
  fromStatus: AssistedCreationStatus | null;
  toStatus: AssistedCreationStatus;
  /** Set when a proof-ready email delivery job successfully sends. */
  emailDeliveryJobId?: string;
}

export type AssistedCreationCustomerRating = 1 | 2 | 3 | 4 | 5;

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
  /** Set when the customer approves a proof with an optional 1–5 rating. */
  customerRating?: AssistedCreationCustomerRating;
  /** Optional short note sent with proof approval. */
  customerApprovalNote?: string;
  /** Server Timestamp or ISO string in DTOs. */
  createdAt: unknown;
  /** Server Timestamp or ISO string in DTOs. */
  updatedAt: unknown;
}
