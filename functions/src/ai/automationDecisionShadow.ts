/**
 * Functions-local facade for catalog automation decisions.
 * Implementation lives in @fresh-prints/shared (Slice 4).
 */
export {
  computeCatalogAutomationDecision,
  computeShadowAutomationDecision,
  runTargetedCatalogVerifier,
  type CatalogAutomationDecisionInput,
  type CatalogAutomationDecisionResult,
  type CatalogVerifierResult,
} from "../../../packages/shared/src/utils/catalogAutomationDecision";

import type {
  DesignSmartProfile,
  SmartProfileAutomationDecision,
} from "../../../packages/shared/src/types/catalog/smartProfile.types";

/** @deprecated Use CatalogAutomationDecisionInput */
export interface ShadowAutomationDecisionInput {
  smartProfile: DesignSmartProfile;
  title?: string;
  categoryId?: string;
  description?: string;
  visibleText?: string[];
}

/** @deprecated Use CatalogAutomationDecisionResult */
export interface ShadowAutomationDecisionResult {
  decision: SmartProfileAutomationDecision;
  reasonCodes: string[];
}
