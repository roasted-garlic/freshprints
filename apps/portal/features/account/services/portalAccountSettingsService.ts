import { httpsCallable } from 'firebase/functions';

import type {
  CancelPortalAccountDeletionRequestResponse,
  RequestPortalAccountDeletionRequest,
  RequestPortalAccountDeletionResponse,
  SyncPortalAccountEmailResponse,
} from '@fresh-prints/shared/types/account/portalAccountSettings.types';

import { getPortalFunctions } from '../../../lib/firebase/client';
import { portalAuthService } from '../../auth/services/authService';

export const portalAccountSettingsService = {
  async syncAccountEmail(): Promise<SyncPortalAccountEmailResponse> {
    try {
      const callable = httpsCallable<Record<string, never>, SyncPortalAccountEmailResponse>(
        getPortalFunctions(),
        'syncPortalAccountEmail',
      );
      const response = await callable({});
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async requestAccountDeletion(confirmation: string): Promise<RequestPortalAccountDeletionResponse> {
    try {
      const callable = httpsCallable<
        RequestPortalAccountDeletionRequest,
        RequestPortalAccountDeletionResponse
      >(getPortalFunctions(), 'requestPortalAccountDeletion');
      const response = await callable({ confirmation });
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async cancelAccountDeletionRequest(): Promise<CancelPortalAccountDeletionRequestResponse> {
    try {
      const callable = httpsCallable<
        Record<string, never>,
        CancelPortalAccountDeletionRequestResponse
      >(getPortalFunctions(), 'cancelPortalAccountDeletionRequest');
      const response = await callable({});
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },
};
