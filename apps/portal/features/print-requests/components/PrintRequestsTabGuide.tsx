'use client';

import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getPortalPrintRequestListTabLabel,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

import { getPortalPrintRequestTabGuideCopy } from '../utils/portalPrintRequestTabCopy';

const guideOpenStorageKeyPrefix = 'fresh-prints-portal-requests-tab-guide-open';

function getStoredGuideOpen(tab: PortalPrintRequestListTab): boolean {
  try {
    return localStorage.getItem(`${guideOpenStorageKeyPrefix}:${tab}`) === 'true';
  } catch {
    return false;
  }
}

interface PrintRequestsTabGuideProps {
  tab: PortalPrintRequestListTab;
}

export function PrintRequestsTabGuide({ tab }: PrintRequestsTabGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tabLabel = getPortalPrintRequestListTabLabel(tab);

  useEffect(() => {
    setIsOpen(getStoredGuideOpen(tab));
  }, [tab]);

  const handleToggle = useCallback(
    (event: React.SyntheticEvent<HTMLDetailsElement>) => {
      const nextOpen = event.currentTarget.open;
      setIsOpen(nextOpen);

      try {
        localStorage.setItem(`${guideOpenStorageKeyPrefix}:${tab}`, String(nextOpen));
      } catch {
        // Ignore storage failures; guide still toggles for this session.
      }
    },
    [tab],
  );

  return (
    <details className="portal-requests-tab-guide" onToggle={handleToggle} open={isOpen}>
      <summary className="portal-requests-tab-guide-summary">
        <span className="portal-requests-tab-guide-summary-label">What does {tabLabel} mean?</span>
        <ChevronDown
          aria-hidden
          className="portal-requests-tab-guide-chevron"
          size={18}
          strokeWidth={2}
        />
      </summary>
      <div className="portal-requests-tab-guide-body">
        <p>{getPortalPrintRequestTabGuideCopy(tab)}</p>
      </div>
    </details>
  );
}
