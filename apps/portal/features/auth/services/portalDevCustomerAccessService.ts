import type { PortalDevCustomerAccessCheckResult } from '@fresh-prints/shared/constants/portal/portalDevCustomerAccess.constants'

import { callTracedFunction } from '../../../lib/firebase/tracedCallable'
import { portalAuthService } from './authService'

export const portalDevCustomerAccessService = {
  async checkAccess(): Promise<PortalDevCustomerAccessCheckResult> {
    try {
      return await callTracedFunction<Record<string, never>, PortalDevCustomerAccessCheckResult>(
        'checkPortalDevCustomerAccess',
        { source: 'portalDevCustomerAccessService.checkAccess' },
      )({})
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error))
    }
  },
}
