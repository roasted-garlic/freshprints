import { useCallback, useState } from "react";

import { userManagementService } from "../services/userManagementService";
import type { UpdateTeamUserInput, UpdateTeamUserResult } from "../types/userManagement.types";

interface UpdateTeamUserState {
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: UpdateTeamUserState = {
  isSubmitting: false,
  error: null,
  successMessage: null,
};

function getUpdateSuccessMessage(result: UpdateTeamUserResult): string {
  return `${result.displayName} was updated.`;
}

export function useUpdateTeamUser() {
  const [state, setState] = useState<UpdateTeamUserState>(initialState);

  const clearMessages = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      error: null,
      successMessage: null,
    }));
  }, []);

  const updateTeamUser = useCallback(async (input: UpdateTeamUserInput) => {
    setState({
      isSubmitting: true,
      error: null,
      successMessage: null,
    });

    try {
      const result = await userManagementService.updateTeamUser(input);
      setState({
        isSubmitting: false,
        error: null,
        successMessage: getUpdateSuccessMessage(result),
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update the user.";

      setState({
        isSubmitting: false,
        error: message,
        successMessage: null,
      });
      throw error;
    }
  }, []);

  return {
    ...state,
    clearMessages,
    updateTeamUser,
  };
}
