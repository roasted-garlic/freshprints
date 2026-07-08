'use client';

import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const guideOpenStorageKey = 'fresh-prints-portal-request-detail-guide-open';

function getStoredGuideOpen(): boolean {
  try {
    return localStorage.getItem(guideOpenStorageKey) === 'true';
  } catch {
    return false;
  }
}

export function PrintRequestDetailGuide() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(getStoredGuideOpen());
  }, []);

  const handleToggle = useCallback((event: React.SyntheticEvent<HTMLDetailsElement>) => {
    const nextOpen = event.currentTarget.open;
    setIsOpen(nextOpen);

    try {
      localStorage.setItem(guideOpenStorageKey, String(nextOpen));
    } catch {
      // Ignore storage failures; guide still toggles for this session.
    }
  }, []);

  return (
    <details className="portal-request-detail-guide" onToggle={handleToggle} open={isOpen}>
      <summary className="portal-request-detail-guide-summary">
        <span className="portal-request-detail-guide-summary-label">How this works</span>
        <ChevronDown
          aria-hidden
          className="portal-request-detail-guide-chevron"
          size={18}
          strokeWidth={2}
        />
      </summary>
      <div className="portal-request-detail-guide-body">
        <p>
          Set quantities and print sizes on each design card. Duplicate a design to add another size.
          Browse the library to add more anytime. When you are ready, queue this request to a Whatnot
          show for printing.
        </p>
      </div>
    </details>
  );
}
