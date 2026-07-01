import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { customerService, type UpdateCustomerRecordInput } from "../services/customerService";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";

interface UpdateCustomerRecordState {
  error: string | null;
  isSubmitting: boolean;
  updatedCustomer: Customer | null;
}

const initialState: UpdateCustomerRecordState = {
  error: null,
  isSubmitting: false,
  updatedCustomer: null,
};

function formatUpdateCustomerError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to update the customer.";
}

export function useUpdateCustomerRecord() {
  const { user } = useAuth();
  const [state, setState] = useState<UpdateCustomerRecordState>(initialState);

  const clearResult = useCallback(() => {
    setState(initialState);
  }, []);

  const updateCustomerRecord = useCallback(
    async (customerId: string, input: UpdateCustomerRecordInput) => {
      if (!user) {
        const message = "You must be signed in to update customers.";
        setState({ error: message, isSubmitting: false, updatedCustomer: null });
        throw new Error(message);
      }

      setState({ error: null, isSubmitting: true, updatedCustomer: null });

      try {
        const updatedCustomer = await customerService.updateCustomerRecord(user, customerId, input);
        setState({ error: null, isSubmitting: false, updatedCustomer });
        return updatedCustomer;
      } catch (error) {
        setState({
          error: formatUpdateCustomerError(error),
          isSubmitting: false,
          updatedCustomer: null,
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
