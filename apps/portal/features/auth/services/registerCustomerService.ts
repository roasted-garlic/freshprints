import type {
  RegisterCustomerRequest,
  RegisterCustomerResponse,
} from '@fresh-prints/shared/types/auth/registerCustomer.types';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { portalAuthService } from './authService';

export const registerCustomerService = {
  async provisionCustomerProfile(input: RegisterCustomerRequest): Promise<RegisterCustomerResponse> {
    try {
      return await callTracedFunction<RegisterCustomerRequest, RegisterCustomerResponse>(
        'registerCustomer',
        { source: 'registerCustomerService.provisionCustomerProfile' },
      )(input);
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },
};
