import { useCallback, useState } from "react";

import { userManagementService } from "../services/userManagementService";
import type { CreateTeamUserInput, CreateTeamUserResult } from "../types/userManagement.types";

interface CreateTeamUserState {
  isSubmitting: boolean;
  error: string | null;
  result: CreateTeamUserResult | null;
}

const initialState: CreateTeamUserState = {
  isSubmitting: false,
  error: null,
  result: null,
};

export function useCreateTeamUser() {
  const [state, setState] = useState<CreateTeamUserState>(initialState);

  const createTeamUser = useCallback(async (input: CreateTeamUserInput) => {
    setState({
      isSubmitting: true,
      error: null,
      result: null,
    });

    try {
      const result = await userManagementService.createTeamUser(input);
      setState({
        isSubmitting: false,
        error: null,
        result,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the user.";
      setState({
        isSubmitting: false,
        error: message,
        result: null,
      });
      throw error;
    }
  }, []);

  const clearResult = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      error: null,
      result: null,
    }));
  }, []);

  return {
    ...state,
    createTeamUser,
    clearResult,
  };
}
