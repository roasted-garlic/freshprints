import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../services/printRequestService";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

interface CustomersState {
  customers: Customer[];
  error: string | null;
  isLoading: boolean;
}
const initialState: CustomersState = {
  customers: [],
  error: null,
  isLoading: true,
};

export function useCustomers() {
  const { user } = useAuth();
  const [state, setState] = useState<CustomersState>(initialState);

  const loadCustomers = useCallback(async () => {
    if (!user || !permissionService.canViewPrintRequests(user)) {
      setState({ customers: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const customers = await printRequestService.listCustomers(user);
      setState({ customers, error: null, isLoading: false });
    } catch (error) {
      setState({
        customers: [],
        error: error instanceof Error ? error.message : "Unable to load customers.",
        isLoading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  return {
    ...state,
    reloadCustomers: loadCustomers,
  };
}
