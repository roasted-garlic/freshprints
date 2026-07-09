import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { userAuditTrailService } from "../services/userAuditTrailService";
import type { AuditTrailEntry, AuditTrailSubject } from "../types/auditTrail.types";

interface AuditTrailState {
  entries: AuditTrailEntry[];
  error: string | null;
  isLoading: boolean;
}

const initialState: AuditTrailState = {
  entries: [],
  error: null,
  isLoading: false,
};

export function useUserAuditTrail(subject: AuditTrailSubject | null) {
  const { user: caller } = useAuth();
  const [state, setState] = useState<AuditTrailState>(initialState);

  const loadAuditTrail = useCallback(async () => {
    if (!subject || !caller) {
      setState(initialState);
      return;
    }

    setState({ entries: [], error: null, isLoading: true });

    try {
      const entries =
        subject.kind === "team_user"
          ? await userAuditTrailService.listTeamUserAuditTrail(caller, subject.user)
          : await userAuditTrailService.listCustomerAuditTrail(caller, subject.customer);

      setState({ entries, error: null, isLoading: false });
    } catch (error) {
      setState({
        entries: [],
        error: error instanceof Error ? error.message : "Unable to load user info.",
        isLoading: false,
      });
    }
  }, [caller, subject]);

  useEffect(() => {
    void loadAuditTrail();
  }, [loadAuditTrail]);

  return {
    ...state,
    reloadAuditTrail: loadAuditTrail,
  };
}
