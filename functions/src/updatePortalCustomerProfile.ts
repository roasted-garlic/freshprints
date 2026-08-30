import { onCall } from "firebase-functions/v2/https";

import type { UpdatePortalCustomerProfileResponse } from "../../packages/shared/src/types/customer/updatePortalCustomerProfile.types";
import { adminAuth } from "./lib/admin";
import { applyCustomerProfileUpdate } from "./lib/customerProfileUpdate";
import { internal, invalidArgument, unauthenticated } from "./lib/errors";
import {
  initializeIdentitySnapshotPropagation,
  runIdentityPropagationWithAutoResume,
} from "./lib/propagateCustomerIdentitySnapshots";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { validateUpdatePortalCustomerProfileRequest } from "./lib/validateUpdatePortalCustomerProfileRequest";

function mapValidationError(error: unknown): never {
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to update your profile right now.");
}

export const updatePortalCustomerProfile = onCall(
  async (request): Promise<UpdatePortalCustomerProfileResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const portalCustomer = await requirePortalCustomer(request.auth.uid);

    try {
      const payload = validateUpdatePortalCustomerProfileRequest(request.data);
      const updateResult = await applyCustomerProfileUpdate({
        customerId: portalCustomer.customerId,
        displayName: payload.displayName,
        username: payload.username,
        mode: "portal",
        callerId: request.auth.uid,
      });

      let portalAuthDisplayNameSynced = true;

      if (
        updateResult.linkedUserId &&
        (updateResult.displayNameChanged || updateResult.usernameChanged)
      ) {
        try {
          await adminAuth.updateUser(updateResult.linkedUserId, {
            displayName: updateResult.displayName,
          });
        } catch (error) {
          portalAuthDisplayNameSynced = false;
          console.error("Failed to sync customer display name to Firebase Auth.", {
            userId: updateResult.linkedUserId,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      let propagationComplete = true;
      let propagationStatus: UpdatePortalCustomerProfileResponse["propagationStatus"] = "completed";
      let printRequestsUpdated = 0;
      let designIssueReportsUpdated = 0;

      if (updateResult.identityChanged) {
        await initializeIdentitySnapshotPropagation(portalCustomer.customerId, {
          username: updateResult.username,
          displayName: updateResult.displayName,
        });

        const propagation = await runIdentityPropagationWithAutoResume(portalCustomer.customerId);
        propagationComplete = propagation.complete;
        propagationStatus = propagation.status;
        printRequestsUpdated = propagation.printRequestsUpdated;
        designIssueReportsUpdated = propagation.designIssueReportsUpdated;
      }

      return {
        customerId: portalCustomer.customerId,
        displayName: updateResult.displayName,
        username: updateResult.username,
        usernameChanged: updateResult.usernameChanged,
        displayNameChanged: updateResult.displayNameChanged,
        portalAuthDisplayNameSynced,
        propagationComplete,
        propagationStatus,
        printRequestsUpdated,
        designIssueReportsUpdated,
      };
    } catch (error) {
      if (error instanceof Error && !(error as { code?: string }).code) {
        mapValidationError(error);
      }

      throw error;
    }
  },
);
