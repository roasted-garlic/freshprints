import { useCallback, useState } from "react";

import type {
  CreateCustomerWithPortalInviteRequest,
  CreateCustomerWithPortalInviteResponse,
} from "@fresh-prints/shared/types/customer/createCustomerWithPortalInvite.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { customerPortalInviteService } from "../services/customerPortalInviteService";

interface CreateCustomerWithPortalInviteState {
  result: CreateCustomerWithPortalInviteResponse | null;
  error: string | null;
  isSubmitting: boolean;
}

const initialState: CreateCustomerWithPortalInviteState = {
  result: null,
  error: null,
  isSubmitting: false,
};

export function useCreateCustomerWithPortalInvite() {
  const { user } = useAuth();
  const [state, setState] = useState<CreateCustomerWithPortalInviteState>(initialState);

  const clearResult = useCallback(() => {
    setState(initialState);
  }, []);

  const createCustomerWithPortalInvite = useCallback(
    async (input: CreateCustomerWithPortalInviteRequest) => {
      if (!user || !permissionService.canManageCustomers(user)) {
        const message = "You do not have permission to create customers.";
        setState({ result: null, error: message, isSubmitting: false });
        throw new Error(message);
      }

      setState({ result: null, error: null, isSubmitting: true });

      try {
        const result = await customerPortalInviteService.createCustomerWithPortalInvite(input);
        setState({ result, error: null, isSubmitting: false });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to create the customer. Please try again.";
        setState({ result: null, error: message, isSubmitting: false });
        throw error;
      }
    },
    [user],
  );

  return {
    ...state,
    clearResult,
    createCustomerWithPortalInvite,
  };
}
