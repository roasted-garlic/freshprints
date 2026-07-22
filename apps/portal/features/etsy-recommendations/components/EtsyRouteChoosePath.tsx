'use client';

import { useEffect, useState } from 'react';
import { Palette, ScanSearch, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Ref, RefObject } from 'react';

import {
  formatAssistedCreationStatus,
  isAssistedCreationOpenStatus,
  type AssistedCreationStatus,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';

import { getPortalAuth } from '../../../lib/firebase/client';
import { AssistedCreationPastRequests } from '../../assisted-creation/components/AssistedCreationPastRequests';
import { assistedCreationService } from '../../assisted-creation/services/assistedCreationService';
import { buildAssistedCreationHref } from '../../assisted-creation/utils/assistedCreationUrlState';

interface EtsyRouteChoosePathProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onFindDesign: () => void;
  onContinueFindDesign?: () => void;
  onResetFindDesign?: () => void;
  hasResumableFindDraft?: boolean;
  onAssistedCreation?: () => void;
  onContinueAssistedCreation?: () => void;
  onResetAssistedCreation?: () => void;
  hasResumableAssistedDraft?: boolean;
}

function openRequestBadgeClass(status: AssistedCreationStatus): string {
  switch (status) {
    case 'submitted':
      return 'etsy-route-card-badge--submitted';
    case 'in_progress':
    case 'revision_requested':
      return 'etsy-route-card-badge--in-progress';
    case 'proof_ready':
      return 'etsy-route-card-badge--proof';
    default:
      return '';
  }
}

export function EtsyRouteChoosePath({
  headingRef,
  onFindDesign,
  onContinueFindDesign,
  onResetFindDesign,
  hasResumableFindDraft = false,
  onAssistedCreation,
  onContinueAssistedCreation,
  onResetAssistedCreation,
  hasResumableAssistedDraft = false,
}: EtsyRouteChoosePathProps) {
  const router = useRouter();
  const assistedEnabled = typeof onAssistedCreation === 'function';
  const [openAssistedStatus, setOpenAssistedStatus] = useState<AssistedCreationStatus | null>(
    null,
  );
  const hasOpenAssistedRequest = openAssistedStatus != null;
  const showAssistedResume =
    assistedEnabled && !hasOpenAssistedRequest && hasResumableAssistedDraft;

  useEffect(() => {
    if (!assistedEnabled) {
      setOpenAssistedStatus(null);
      return;
    }
    const uid = getPortalAuth().currentUser?.uid;
    if (!uid) {
      setOpenAssistedStatus(null);
      return;
    }
    return assistedCreationService.subscribeOpenRequestsForCustomer(
      uid,
      (items) => {
        const open = items.find((item) => isAssistedCreationOpenStatus(item.status));
        setOpenAssistedStatus(open?.status ?? null);
      },
      () => setOpenAssistedStatus(null),
    );
  }, [assistedEnabled]);

  return (
    <section aria-labelledby="etsy-route-choose-title" className="etsy-route-choose">
      <header className="etsy-route-choose-header">
        <h1
          className="etsy-route-choose-title"
          id="etsy-route-choose-title"
          ref={headingRef as Ref<HTMLHeadingElement>}
          tabIndex={-1}
        >
          How can we help with your design?
        </h1>
        <p className="portal-muted etsy-route-choose-lead">
          Choose how you want design help. Tell us what you are looking for and we will help you
          find matching designs.
        </p>
      </header>

      <div className="etsy-route-cards">
        <article className="etsy-route-card etsy-route-card-active">
          <div aria-hidden="true" className="etsy-route-card-icon">
            <ScanSearch absoluteStrokeWidth strokeWidth={1.25} />
          </div>
          <div className="etsy-route-card-body">
            <h2 className="etsy-route-card-title">Help Me Find a Design</h2>
            <p className="etsy-route-card-description">
              {hasResumableFindDraft
                ? 'You have a search in progress. Continue where you left off, or reset to start over.'
                : 'Tell us what you are looking for and we will search for designs that may match.'}
            </p>
          </div>
          {hasResumableFindDraft ? (
            <div className="etsy-route-card-actions">
              <button
                className="portal-button portal-button-secondary etsy-route-card-action"
                onClick={onResetFindDesign ?? onFindDesign}
                type="button"
              >
                Reset search
              </button>
              <button
                className="portal-button portal-button-primary etsy-route-card-action"
                onClick={onContinueFindDesign ?? onFindDesign}
                type="button"
              >
                Continue search
              </button>
            </div>
          ) : (
            <button
              className="portal-button portal-button-primary etsy-route-card-action"
              onClick={onFindDesign}
              type="button"
            >
              Find a design
            </button>
          )}
        </article>

        <article
          aria-disabled={assistedEnabled ? undefined : true}
          className={`etsy-route-card${assistedEnabled ? ' etsy-route-card-active' : ' etsy-route-card-disabled'}`}
        >
          <div aria-hidden="true" className="etsy-route-card-icon">
            <Palette absoluteStrokeWidth strokeWidth={1.25} />
          </div>
          <div className="etsy-route-card-body">
            <div className="etsy-route-card-badge-row">
              <h2 className="etsy-route-card-title">Fresh Prints Assisted Creation</h2>
              {assistedEnabled ? (
                openAssistedStatus ? (
                  <span
                    className={`etsy-route-card-badge ${openRequestBadgeClass(openAssistedStatus)}`}
                  >
                    {formatAssistedCreationStatus(openAssistedStatus)}
                  </span>
                ) : null
              ) : (
                <span className="etsy-route-card-badge">Coming soon</span>
              )}
            </div>
            <p className="etsy-route-card-description">
              {hasOpenAssistedRequest
                ? 'You already have an assisted request open. View its status, or cancel it before starting a new one.'
                : showAssistedResume
                  ? 'You have a request in progress. Continue where you left off, or reset to start over.'
                  : 'Send Fresh Prints the details for a design you would like us to help create.'}
            </p>
          </div>
          {!assistedEnabled ? (
            <button
              aria-disabled="true"
              className="portal-button portal-button-secondary etsy-route-card-action"
              disabled
              type="button"
            >
              Coming soon
            </button>
          ) : hasOpenAssistedRequest ? (
            <button
              className="portal-button portal-button-secondary etsy-route-card-action"
              onClick={() => {
                router.push(buildAssistedCreationHref({ mode: 'status' }));
              }}
              type="button"
            >
              View request status
            </button>
          ) : showAssistedResume ? (
            <div className="etsy-route-card-actions">
              <button
                className="portal-button portal-button-secondary etsy-route-card-action"
                onClick={onResetAssistedCreation ?? onAssistedCreation}
                type="button"
              >
                Reset request
              </button>
              <button
                className="portal-button portal-button-primary etsy-route-card-action"
                onClick={onContinueAssistedCreation ?? onAssistedCreation}
                type="button"
              >
                Continue request
              </button>
            </div>
          ) : (
            <button
              className="portal-button portal-button-primary etsy-route-card-action"
              onClick={onAssistedCreation}
              type="button"
            >
              Start assisted request
            </button>
          )}
        </article>

        {assistedEnabled ? (
          <AssistedCreationPastRequests className="assisted-creation-past-link-wrap etsy-route-past-link" />
        ) : null}

        <article aria-disabled="true" className="etsy-route-card etsy-route-card-disabled">
          <div aria-hidden="true" className="etsy-route-card-icon">
            <Sparkles absoluteStrokeWidth strokeWidth={1.25} />
          </div>
          <div className="etsy-route-card-body">
            <div className="etsy-route-card-badge-row">
              <h2 className="etsy-route-card-title">Create My Design with AI</h2>
              <span className="etsy-route-card-badge">Coming soon</span>
            </div>
            <p className="etsy-route-card-description">
              Choose a design style and tell us what you want the design to include.
            </p>
          </div>
          <button
            aria-disabled="true"
            className="portal-button portal-button-secondary etsy-route-card-action"
            disabled
            type="button"
          >
            Coming soon
          </button>
        </article>
      </div>
    </section>
  );
}
