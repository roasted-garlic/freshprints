import type { CustomerUploadTechnicalStatus } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";

const ALLOWED: Record<CustomerUploadTechnicalStatus, readonly CustomerUploadTechnicalStatus[]> = {
  awaiting_upload: ["uploading", "validating", "failed"],
  uploading: ["validating", "failed"],
  validating: ["processing", "failed"],
  processing: ["ready", "failed"],
  failed: ["validating"],
  ready: [],
};

export function canTransitionTechnicalStatus(
  from: CustomerUploadTechnicalStatus,
  to: CustomerUploadTechnicalStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTechnicalStatusTransition(
  from: CustomerUploadTechnicalStatus,
  to: CustomerUploadTechnicalStatus,
): void {
  if (!canTransitionTechnicalStatus(from, to)) {
    throw new Error(`Invalid technical status transition: ${from} → ${to}`);
  }
}
