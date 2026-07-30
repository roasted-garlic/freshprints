import { isFirebaseDebugPanelEnabled } from '@fresh-prints/shared/utils/firebaseDebugPanelGate';

import { getPortalFirebaseConfig } from '../../../lib/firebase/env';

export function isFirebaseDebugPanelEnabledForPortal(): boolean {
  return isFirebaseDebugPanelEnabled({
    isDevelopmentBuild: process.env.NODE_ENV !== 'production',
    projectId: getPortalFirebaseConfig().projectId,
  });
}
