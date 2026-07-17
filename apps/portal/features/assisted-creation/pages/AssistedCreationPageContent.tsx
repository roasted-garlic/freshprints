'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  isAssistedCreationOpenStatus,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationRequest } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

import { getPortalAuth } from '../../../lib/firebase/client';
import { AssistedCreationStatusPanel } from '../components/AssistedCreationStatusPanel';
import { AssistedCreationWizard } from '../components/AssistedCreationWizard';
import { useAssistedCreationWizard } from '../hooks/useAssistedCreationWizard';
import { useLiveCustomDesignsLocation } from '../hooks/useLiveCustomDesignsLocation';
import { assistedCreationService } from '../services/assistedCreationService';
import { stepIndexForId } from '../utils/assistedCreationDraftStorage';
import {
  buildAssistedCreationHref,
  parseAssistedCreationLocation,
} from '../utils/assistedCreationUrlState';

export function AssistedCreationPageContent() {
  const router = useRouter();
  const { pathname, searchParams } = useLiveCustomDesignsLocation();
  const parsed = useMemo(
    () => parseAssistedCreationLocation(pathname, searchParams),
    [pathname, searchParams],
  );
  const [openRequest, setOpenRequest] = useState<AssistedCreationRequest | null>(null);
  const [checkingOpen, setCheckingOpen] = useState(true);

  useEffect(() => {
    if (!parsed.isLegacyPath) {
      return;
    }
    const href =
      parsed.mode === 'status'
        ? buildAssistedCreationHref({ mode: 'status' })
        : buildAssistedCreationHref({ mode: 'wizard', stepId: parsed.stepId ?? 'description' });
    router.replace(href, { scroll: false });
  }, [parsed.isLegacyPath, parsed.mode, parsed.stepId, router]);

  useEffect(() => {
    const uid = getPortalAuth().currentUser?.uid;
    if (!uid) {
      setCheckingOpen(false);
      return;
    }
    return assistedCreationService.subscribeOpenRequestsForCustomer(
      uid,
      (items) => {
        setOpenRequest(items[0] ?? null);
        setCheckingOpen(false);
      },
      () => setCheckingOpen(false),
    );
  }, []);

  const onStepChange = useCallback(
    (stepId: AssistedCreationWizardStepId) => {
      if (parsed.mode === 'wizard' && parsed.stepId === stepId && !parsed.isLegacyPath) {
        return;
      }
      // Never replace a deeper browser step with an earlier one during hydration races.
      if (typeof window !== 'undefined') {
        const live = parseAssistedCreationLocation(
          window.location.pathname,
          new URLSearchParams(window.location.search),
        );
        if (live.isAssisted && live.mode === 'wizard' && live.stepId) {
          if (stepIndexForId(stepId) < stepIndexForId(live.stepId)) {
            return;
          }
        }
      }
      router.replace(buildAssistedCreationHref({ mode: 'wizard', stepId }), { scroll: false });
    },
    [parsed.isLegacyPath, parsed.mode, parsed.stepId, router],
  );

  const wizardEnabled = parsed.mode === 'wizard' && !openRequest && !checkingOpen;

  const wizard = useAssistedCreationWizard({
    enabled: wizardEnabled,
    initialStepId: parsed.stepId,
    onStepChange,
  });

  // Only bounce wizard entry to status when an open request exists — never when the
  // user is on choose path (`/custom-designs` without assisted flow).
  useEffect(() => {
    if (checkingOpen) {
      return;
    }
    if (openRequest && parsed.mode === 'wizard') {
      router.replace(buildAssistedCreationHref({ mode: 'status' }), { scroll: false });
    }
  }, [checkingOpen, openRequest, parsed.mode, router]);

  if (checkingOpen) {
    return (
      <main className="portal-page etsy-recommendations-page">
        <p className="portal-muted">Loading…</p>
      </main>
    );
  }

  // Status UI only for status mode. Do not force status merely because an open
  // request exists — that trapped Back / Custom Designs on this page.
  if (parsed.mode === 'status') {
    return (
      <main className="portal-page etsy-recommendations-page">
        <AssistedCreationStatusPanel
          onStartNew={
            openRequest
              ? undefined
              : () => {
                  wizard.resetWizard();
                  router.push(
                    buildAssistedCreationHref({ mode: 'wizard', stepId: 'description' }),
                  );
                }
          }
        />
      </main>
    );
  }

  if (openRequest) {
    return (
      <main className="portal-page etsy-recommendations-page">
        <p className="portal-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="portal-page etsy-recommendations-page">
      <AssistedCreationWizard
        answers={wizard.answers}
        isLastStep={wizard.isLastStep}
        isSubmitting={wizard.isSubmitting}
        onAnswersChange={wizard.setAnswers}
        onBack={() => {
          if (wizard.isFirstStep) {
            router.push('/custom-designs');
            return;
          }
          wizard.goBack();
        }}
        onNext={() => {
          wizard.goNext();
        }}
        onReferenceFilesChange={wizard.setReferenceFiles}
        onSubmit={() => {
          void wizard.submit().then((requestId) => {
            if (requestId) {
              router.replace(buildAssistedCreationHref({ mode: 'status' }), { scroll: false });
            }
          });
        }}
        referenceFiles={wizard.referenceFiles}
        referenceFilesError={wizard.referenceFilesError}
        stepError={wizard.stepError}
        stepId={wizard.stepId}
        stepIndex={wizard.stepIndex}
        stepTitle={wizard.stepTitle}
        submitStatusMessage={wizard.submitStatusMessage}
      />
    </main>
  );
}

export function hasOpenAssistedCreationStatus(
  status: AssistedCreationRequest['status'] | undefined,
): boolean {
  return status != null && isAssistedCreationOpenStatus(status);
}
