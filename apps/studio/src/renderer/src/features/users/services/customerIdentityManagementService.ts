import { HARD_DELETE_CUSTOMER_CONFIRMATION_PHRASE, MERGE_ACCOUNTS_CONFIRMATION_PHRASE, TRANSFER_USERNAME_CONFIRMATION_PHRASE } from "@fresh-prints/shared/constants/customerIdentityConfirmationPhrases";
import type {
  ApplyCustomerAccountMergeRequest,
  ApplyCustomerAccountMergeResponse,
  GetCustomerAccountMergeStatusRequest,
  GetCustomerAccountMergeStatusResponse,
  PreviewCustomerAccountMergeRequest,
  PreviewCustomerAccountMergeResponse,
} from "@fresh-prints/shared/types/customer/customerAccountMerge.types";
import type {
  DisableCustomerAccountResponse,
  HardDeleteCustomerAccountResponse,
  PreviewHardDeleteCustomerAccountResponse,
  RestoreCustomerAccountResponse,
} from "@fresh-prints/shared/types/customer/customerIdentityManagement.types";
import type {
  PreviewDuplicateAccountResolutionRequest,
  PreviewDuplicateAccountResolutionResponse,
  TransferCustomerUsernameRequest,
  TransferCustomerUsernameResponse,
} from "@fresh-prints/shared/types/customer/customerDuplicateResolution.types";

import { callTracedFunction } from "../../../config/tracedCallable";
import { warmDeletionCallableBackground } from "../../deletion/services/deletionCallableWarmupService";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code === "functions/internal"
  ) {
    return "The server could not complete this identity operation. Try again or check fresh-prints-dev Function logs.";
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    const message = error.message.trim();
    if (message.toLowerCase() === "internal") {
      return "The server could not complete this identity operation. Try again or check fresh-prints-dev Function logs.";
    }
    return message;
  }

  return fallbackMessage;
}

export const customerIdentityManagementService = {
  hardDeleteConfirmationPhrase: HARD_DELETE_CUSTOMER_CONFIRMATION_PHRASE,
  transferUsernameConfirmationPhrase: TRANSFER_USERNAME_CONFIRMATION_PHRASE,
  mergeAccountsConfirmationPhrase: MERGE_ACCOUNTS_CONFIRMATION_PHRASE,

  warmHardDeleteMutateCallable(): void {
    warmDeletionCallableBackground("hardDeleteCustomerAccount");
  },

  async previewHardDelete(customerId: string): Promise<PreviewHardDeleteCustomerAccountResponse> {
    try {
      return await callTracedFunction<
        { customerId: string },
        PreviewHardDeleteCustomerAccountResponse
      >("previewHardDeleteCustomerAccount", {
        source: "customerIdentityManagementService.previewHardDelete",
      })({ customerId });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview permanent customer deletion."),
      );
    }
  },

  async hardDelete(input: {
    customerId: string;
    confirmationPhrase: string;
    previewId: string;
    previewChecksum: string;
  }): Promise<HardDeleteCustomerAccountResponse> {
    try {
      return await callTracedFunction<
        typeof input,
        HardDeleteCustomerAccountResponse
      >("hardDeleteCustomerAccount", {
        source: "customerIdentityManagementService.hardDelete",
      })(input);
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to permanently delete the customer account."),
      );
    }
  },

  async disable(customerId: string, reason?: string): Promise<DisableCustomerAccountResponse> {
    try {
      return await callTracedFunction<
        { customerId: string; reason?: string },
        DisableCustomerAccountResponse
      >("disableCustomerAccount", {
        source: "customerIdentityManagementService.disable",
      })({ customerId, reason });
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to disable the customer account."));
    }
  },

  async restore(customerId: string): Promise<RestoreCustomerAccountResponse> {
    try {
      return await callTracedFunction<{ customerId: string }, RestoreCustomerAccountResponse>(
        "restoreCustomerAccount",
        { source: "customerIdentityManagementService.restore" },
      )({ customerId });
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to restore the customer account."));
    }
  },

  async previewDuplicateResolution(
    input: PreviewDuplicateAccountResolutionRequest,
  ): Promise<PreviewDuplicateAccountResolutionResponse> {
    try {
      return await callTracedFunction<
        PreviewDuplicateAccountResolutionRequest,
        PreviewDuplicateAccountResolutionResponse
      >("previewDuplicateAccountResolution", {
        source: "customerIdentityManagementService.previewDuplicateResolution",
      })(input);
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview duplicate account resolution."),
      );
    }
  },

  async transferUsername(
    input: TransferCustomerUsernameRequest,
  ): Promise<TransferCustomerUsernameResponse> {
    try {
      return await callTracedFunction<
        TransferCustomerUsernameRequest,
        TransferCustomerUsernameResponse
      >("transferCustomerUsername", {
        source: "customerIdentityManagementService.transferUsername",
      })(input);
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to transfer the username."));
    }
  },

  async previewAccountMerge(
    input: PreviewCustomerAccountMergeRequest,
  ): Promise<PreviewCustomerAccountMergeResponse> {
    try {
      return await callTracedFunction<
        PreviewCustomerAccountMergeRequest,
        PreviewCustomerAccountMergeResponse
      >("previewCustomerAccountMerge", {
        source: "customerIdentityManagementService.previewAccountMerge",
      })(input);
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to preview account merge."));
    }
  },

  async applyAccountMerge(
    input: ApplyCustomerAccountMergeRequest,
  ): Promise<ApplyCustomerAccountMergeResponse> {
    try {
      return await callTracedFunction<
        ApplyCustomerAccountMergeRequest,
        ApplyCustomerAccountMergeResponse
      >("applyCustomerAccountMerge", {
        source: "customerIdentityManagementService.applyAccountMerge",
      })(input);
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to start account merge."));
    }
  },

  async getAccountMergeStatus(
    input: GetCustomerAccountMergeStatusRequest,
  ): Promise<GetCustomerAccountMergeStatusResponse> {
    try {
      return await callTracedFunction<
        GetCustomerAccountMergeStatusRequest,
        GetCustomerAccountMergeStatusResponse
      >("getCustomerAccountMergeStatus", {
        source: "customerIdentityManagementService.getAccountMergeStatus",
      })(input);
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to load account merge status."));
    }
  },
};
