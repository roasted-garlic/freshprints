import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { customerService, type CreateCustomerRecordInput } from "../services/customerService";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

interface CreateCustomerRecordState {
  createdCustomer: Customer | null;
  error: string | null;
  isSubmitting: boolean;
}

const initialState: CreateCustomerRecordState = {
  createdCustomer: null,
  error: null,
  isSubmitting: false,
};

function formatCustomerRecordError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unable to create customer.";

  if (/permission/i.test(message)) {
    return `${message} Customer permissions may still be pending review.`;
  }

  return message;
}

export function useCreateCustomerRecord() {
  const { user } = useAuth();
  const [state, setState] = useState<CreateCustomerRecordState>(initialState);

  const clearResult = useCallback(() => {
    setState(initialState);
  }, []);

  const createCustomerRecord = useCallback(
    async (input: CreateCustomerRecordInput) => {
      if (!user) {
        const message = "You must be signed in to create customers.";
        setState({ createdCustomer: null, error: message, isSubmitting: false });
        throw new Error(message);
      }

      setState({ createdCustomer: null, error: null, isSubmitting: true });

      try {
        const createdCustomer = await customerService.createCustomerRecord(user, input);
        setState({ createdCustomer, error: null, isSubmitting: false });
        return createdCustomer;
      } catch (error) {
        const message = formatCustomerRecordError(error);
        setState({ createdCustomer: null, error: message, isSubmitting: false });
        throw error;
      }
    },
    [user],
  );

  return {
    ...state,
    clearResult,
    createCustomerRecord,
  };
}
