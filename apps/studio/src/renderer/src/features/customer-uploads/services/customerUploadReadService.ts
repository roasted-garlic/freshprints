import { doc, getDoc } from "firebase/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants";
import type { CustomerUploadTechnicalStatus } from "@fresh-prints/shared/types/customerUpload/customerUpload.enums";

import { db } from "../../../config/firebase";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";

export interface StudioCustomerUploadSummary {
  id: string;
  customerUid: string;
  originalFilename: string;
  productionStoragePath: string | null;
  previewStoragePath: string | null;
  thumbnailStoragePath: string | null;
  printWidthInches: number | null;
  printHeightInches: number | null;
  widthPx: number | null;
  heightPx: number | null;
  technicalStatus: CustomerUploadTechnicalStatus;
  catalogReviewStatus: string | null;
}

export const customerUploadReadService = {
  async getUploadById(caller: User, uploadId: string): Promise<StudioCustomerUploadSummary | null> {
    if (
      !permissionService.canViewCustomerUploadIntake(caller) &&
      !permissionService.canViewUpcomingShows(caller) &&
      !permissionService.canManagePrintRequests(caller)
    ) {
      throw new Error("You do not have permission to view customer uploads.");
    }

    const snapshot = await getDoc(doc(db, CUSTOMER_UPLOAD_COLLECTIONS.customerUploads, uploadId));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      customerUid: String(data.customerUid ?? ""),
      originalFilename: String(data.originalFilename ?? "Uploaded artwork"),
      productionStoragePath:
        typeof data.productionStoragePath === "string" ? data.productionStoragePath : null,
      previewStoragePath: typeof data.previewStoragePath === "string" ? data.previewStoragePath : null,
      thumbnailStoragePath:
        typeof data.thumbnailStoragePath === "string" ? data.thumbnailStoragePath : null,
      printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : null,
      printHeightInches: typeof data.printHeightInches === "number" ? data.printHeightInches : null,
      widthPx: typeof data.widthPx === "number" ? data.widthPx : null,
      heightPx: typeof data.heightPx === "number" ? data.heightPx : null,
      technicalStatus: data.technicalStatus as CustomerUploadTechnicalStatus,
      catalogReviewStatus:
        typeof data.catalogReviewStatus === "string" ? data.catalogReviewStatus : null,
    };
  },
};
