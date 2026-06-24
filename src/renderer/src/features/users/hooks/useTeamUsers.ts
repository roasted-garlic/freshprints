import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { userService } from "../services/userService";
import type { User } from "../types/user.types";
interface TeamUsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TeamUsersState = {
  users: [],
  isLoading: true,
  error: null,
};

export function useTeamUsers() {
  const { user } = useAuth();
  const [state, setState] = useState<TeamUsersState>(initialState);

  const loadUsers = useCallback(async () => {
    if (!user || !permissionService.canViewUsers(user)) {
      setState({ users: [], isLoading: false, error: null });
      return;
    }

    setState((currentState) => ({
      ...currentState,
      isLoading: true,
      error: null,
    }));

    try {
      const users = await userService.listTeamUsers(user);
      setState({
        users,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        users: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to load team users.",
      });
    }
  }, [user]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return {
    ...state,
    reloadUsers: loadUsers,
  };
}
