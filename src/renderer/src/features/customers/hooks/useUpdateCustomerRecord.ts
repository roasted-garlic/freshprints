import { useCallback, useState } from "react";

import type { UpdateCustomerResponse } from "@fresh-prints/shared/types/customer/updateCustomer.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { customerService, type UpdateCustomerRecordInput } from "../services/customerService";
import { customerUpdateService } from "../services/customerUpdateService";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

interface UpdateCustomerRecordState {
  error: string | null;
  isSubmitting: boolean;
  updatedCustomer: Customer | null;
  updateResult: UpdateCustomerResponse | null;
}

const initialState: UpdateCustomerRecordState = {
  error: null,
  isSubmitting: false,
  updatedCustomer: null,
  updateResult: null,
};

function formatUpdateCustomerError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to update the customer.";
}

export function buildCustomerUpdateSuccessMessage(
  result: UpdateCustomerResponse,
  displayName: string,
): string {
  let message = `Customer "${displayName}" was updated.`;

  if (result.usernameChanged) {
    message += " Existing print request names were not renamed.";
  }

  if (!result.portalAuthEmailSynced) {
    message +=
      " Firestore was updated, but the Portal login email could not be synced to Firebase Authentication. Retry the save or update Auth manually.";
  }

  return message;
}

export function useUpdateCustomerRecord() {
  const { user } = useAuth();
  const [state, setState] = useState<UpdateCustomerRecordState>(initialState);

  const clearResult = useCallback(() => {
    setState(initialState);
  }, []);

  const updateCustomerRecord = useCallback(
    async (customerId: string, input: UpdateCustomerRecordInput) => {
      if (!user || !permissionService.canManageCustomers(user)) {
        const message = "You do not have permission to update customers.";
        setState({ ...initialState, error: message });
        throw new Error(message);
      }

      setState({ ...initialState, isSubmitting: true });

      try {
        const updateResult = await customerUpdateService.updateCustomer({
          customerId,
          ...input,
        });
        const updatedCustomer = await customerService.getCustomerById(user, customerId);
        setState({
          error: null,
          isSubmitting: false,
          updatedCustomer,
          updateResult,
        });
        return { updatedCustomer, updateResult };
      } catch (error) {
        setState({
          error: formatUpdateCustomerError(error),
          isSubmitting: false,
          updatedCustomer: null,
          updateResult: null,
        });
        throw error;
      }
    },
    [user],
  );

  return {
    ...state,
    clearResult,
    updateCustomerRecord,
  };
}
