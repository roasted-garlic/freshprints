'use client';

import { useCallback, useEffect, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { useAuth } from '../../auth/context/AuthContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';

export function useMyPrintRequests() {
  const { customer, firebaseUser } = useAuth();
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!customer?.id) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextRequests = await portalPrintRequestService.listMyPrintRequests(customer.id);
      setRequests(nextRequests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print requests.');
    } finally {
      setIsLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createPrintRequest = useCallback(
    async (notes?: string) => {
      if (!firebaseUser) {
        throw new Error('You must be signed in to create a print request.');
      }

      const created = await portalPrintRequestService.createPrintRequest(notes ? { notes } : {});
      await reload();
      return created;
    },
    [firebaseUser, reload],
  );

  return {
    requests,
    isLoading,
    error,
    reload,
    createPrintRequest,
  };
}
