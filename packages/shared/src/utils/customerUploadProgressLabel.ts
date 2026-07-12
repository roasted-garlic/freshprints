import type {
  CustomerUploadTechnicalProgressStage,
  CustomerUploadTechnicalStatus,
} from "../types/customerUpload/customerUpload.enums";

export function getCustomerUploadProgressLabel(input: {
  technicalStatus: CustomerUploadTechnicalStatus | string;
  technicalProgressStage?: CustomerUploadTechnicalProgressStage | string | null;
}): string {
  if (input.technicalStatus === "ready") {
    return "Ready";
  }
  if (input.technicalStatus === "failed") {
    return "Failed";
  }

  switch (input.technicalProgressStage) {
    case "reading_upload":
      return "Reading upload…";
    case "checking_format":
      return "Checking file format…";
    case "checking_transparency":
      return "Checking transparency…";
    case "converting_format":
      return "Converting to print format…";
    case "trimming":
      return "Trimming transparent edges…";
    case "upscaling":
      return "Upscaling for print quality…";
    case "preparing_artwork":
      return "Preparing artwork…";
    case "checking_print_size":
      return "Checking DPI…";
    case "creating_previews":
      return "Creating previews…";
    case "saving":
      return "Saving…";
    default:
      break;
  }

  switch (input.technicalStatus) {
    case "awaiting_upload":
      return "Waiting…";
    case "uploading":
      return "Uploading…";
    case "validating":
      return "Validating…";
    case "processing":
      return "Processing…";
    default:
      return "Processing…";
  }
}
