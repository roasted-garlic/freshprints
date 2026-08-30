import type {
  CancelPortalAccountDeletionRequestResponse,
  RequestPortalAccountDeletionRequest,
  RequestPortalAccountDeletionResponse,
  SyncPortalAccountEmailResponse,
} from '@fresh-prints/shared/types/account/portalAccountSettings.types';
import type {
  UpdatePortalCustomerProfileRequest,
  UpdatePortalCustomerProfileResponse,
} from '@fresh-prints/shared/types/customer/updatePortalCustomerProfile.types';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { portalAuthService } from '../../auth/services/authService';

export const portalAccountSettingsService = {
  async syncAccountEmail(): Promise<SyncPortalAccountEmailResponse> {
    try {
      return await callTracedFunction<Record<string, never>, SyncPortalAccountEmailResponse>(
        'syncPortalAccountEmail',
        { source: 'portalAccountSettingsService.syncAccountEmail' },
      )({});
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async requestAccountDeletion(confirmation: string): Promise<RequestPortalAccountDeletionResponse> {
    try {
      return await callTracedFunction<
        RequestPortalAccountDeletionRequest,
        RequestPortalAccountDeletionResponse
      >('requestPortalAccountDeletion', {
        source: 'portalAccountSettingsService.requestAccountDeletion',
      })({ confirmation });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async cancelAccountDeletionRequest(): Promise<CancelPortalAccountDeletionRequestResponse> {
    try {
      return await callTracedFunction<
        Record<string, never>,
        CancelPortalAccountDeletionRequestResponse
      >('cancelPortalAccountDeletionRequest', {
        source: 'portalAccountSettingsService.cancelAccountDeletionRequest',
      })({});
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async updateCustomerProfile(
    input: UpdatePortalCustomerProfileRequest,
  ): Promise<UpdatePortalCustomerProfileResponse> {
    try {
      return await callTracedFunction<
        UpdatePortalCustomerProfileRequest,
        UpdatePortalCustomerProfileResponse
      >('updatePortalCustomerProfile', {
        source: 'portalAccountSettingsService.updateCustomerProfile',
      })(input);
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },
};
