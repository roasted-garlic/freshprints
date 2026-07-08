import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { customerService } from "../services/customerService";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

interface CustomersDirectoryState {
  customers: Customer[];
  error: string | null;
  isLoading: boolean;
}

const initialState: CustomersDirectoryState = {
  customers: [],
  error: null,
  isLoading: true,
};

export function useCustomersDirectory() {
  const { user } = useAuth();
  const [state, setState] = useState<CustomersDirectoryState>(initialState);

  const loadCustomers = useCallback(async () => {
    if (!user || !permissionService.canManageCustomers(user)) {
      setState({ customers: [], error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const customers = await customerService.listCustomers(user);
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
