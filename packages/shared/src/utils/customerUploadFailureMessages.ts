import type { CustomerUploadTechnicalFailureCode } from "../types/customerUpload/customerUpload.enums";

export const CUSTOMER_UPLOAD_FORMAT_FAILURE_MESSAGE =
  "Please upload the original PNG artwork file.";

export const CUSTOMER_UPLOAD_TRANSPARENCY_FAILURE_MESSAGE =
  "This image does not have a usable transparent background. Please upload the original artwork with the background removed.";

export const CUSTOMER_UPLOAD_QUALITY_FAILURE_MESSAGE =
  "This image is too small to produce a good-quality print. Please upload a higher-resolution original.";

export const CUSTOMER_UPLOAD_PROCESSING_FAILURE_MESSAGE =
  "We couldn't process this artwork. Please try another file or upload the original artwork.";

/**
 * Maps trusted server failure codes to customer-safe copy for Portal uploads.
 */
export function resolveCustomerUploadFailureMessage(
  code: CustomerUploadTechnicalFailureCode,
  technicalMessage?: string,
): string {
  switch (code) {
    case "unsupported_format":
    case "animated_rejected":
      return CUSTOMER_UPLOAD_FORMAT_FAILURE_MESSAGE;
    case "background_not_transparent":
      return CUSTOMER_UPLOAD_TRANSPARENCY_FAILURE_MESSAGE;
    case "image_exceeds_limits":
      if (technicalMessage?.toLowerCase().includes("quality")) {
        return CUSTOMER_UPLOAD_QUALITY_FAILURE_MESSAGE;
      }
      if (technicalMessage?.toLowerCase().includes("small")) {
        return CUSTOMER_UPLOAD_QUALITY_FAILURE_MESSAGE;
      }
      return CUSTOMER_UPLOAD_QUALITY_FAILURE_MESSAGE;
    case "could_not_decode":
    case "processing_failed":
    case "transparency_check_failed":
      return CUSTOMER_UPLOAD_PROCESSING_FAILURE_MESSAGE;
    default:
      return CUSTOMER_UPLOAD_PROCESSING_FAILURE_MESSAGE;
  }
}
