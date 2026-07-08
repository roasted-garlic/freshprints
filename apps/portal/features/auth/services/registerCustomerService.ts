import { httpsCallable } from 'firebase/functions';

import type {
  RegisterCustomerRequest,
  RegisterCustomerResponse,
} from '@fresh-prints/shared/types/auth/registerCustomer.types';

import { getPortalFunctions } from '../../../lib/firebase/client';
import { portalAuthService } from './authService';

export const registerCustomerService = {
  async provisionCustomerProfile(input: RegisterCustomerRequest): Promise<RegisterCustomerResponse> {
    try {
      const registerCustomerCallable = httpsCallable<RegisterCustomerRequest, RegisterCustomerResponse>(
        getPortalFunctions(),
        'registerCustomer',
      );
      const response = await registerCustomerCallable(input);
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },
};
