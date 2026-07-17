'use client';

import { useRouter } from 'next/navigation';

import { ASSISTED_CREATION_WIZARD_STEPS } from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';

import { readAssistedCreationDraft } from '../../assisted-creation/utils/assistedCreationDraftStorage';
import { buildAssistedCreationHref } from '../../assisted-creation/utils/assistedCreationUrlState';
import { EtsyQuestionnaire } from '../components/EtsyQuestionnaire';
import { EtsyResultsDashboard } from '../components/EtsyResultsDashboard';
import { EtsyRouteChoosePath } from '../components/EtsyRouteChoosePath';
import { useEtsyRecommendationWizard } from '../hooks/useEtsyRecommendationWizard';

export function EtsyRecommendationsPageContent() {
  const router = useRouter();
  const wizard = useEtsyRecommendationWizard();

  if (wizard.isRestoringFromUrl) {
    return (
      <main className="portal-page etsy-recommendations-page">
        <p className="portal-muted">Loading your design search…</p>
      </main>
    );
  }

  return (
    <main className="portal-page etsy-recommendations-page">
      {wizard.view === 'choose' ? (
        <EtsyRouteChoosePath
          headingRef={wizard.focusHeadingRef}
          hasResumableFindDraft={wizard.hasResumableFindDraft}
          onAssistedCreation={() => {
            const draft = readAssistedCreationDraft();
            const stepId =
              draft != null
                ? (ASSISTED_CREATION_WIZARD_STEPS[draft.stepIndex]?.id ?? 'description')
                : 'description';
            router.push(buildAssistedCreationHref({ mode: 'wizard', stepId }));
          }}
          onContinueFindDesign={wizard.continueFindDesign}
          onFindDesign={wizard.beginFindDesign}
          onResetFindDesign={wizard.resetFindDesign}
        />
      ) : null}

      {wizard.view === 'screen1' ||
      wizard.view === 'screen2' ||
      wizard.view === 'screen3' ||
      wizard.view === 'review' ? (
        <EtsyQuestionnaire
          actionError={wizard.actionError}
          answers={wizard.answers}
          fieldError={wizard.fieldError}
          headingRef={wizard.focusHeadingRef}
          isSubmitting={wizard.isSubmitting}
          onBack={wizard.goBack}
          onEditDetails={wizard.editSearch}
          onNextFromScreen1={wizard.goNextFromScreen1}
          onNextFromScreen2={wizard.goNextFromScreen2}
          onNextFromScreen3={wizard.goNextFromScreen3}
          onSubjectTextChange={wizard.updateSubjectText}
          onStyleTextChange={wizard.updateStyleText}
          onSubmitSearch={wizard.submitFromReview}
          onWordingChange={wizard.updateWording}
          screen={wizard.view}
          searchPreview={wizard.searchPreview}
        />
      ) : null}

      {wizard.view === 'results' ? (
        <EtsyResultsDashboard
          actionError={wizard.actionError}
          broaderSearchUrl={wizard.broaderSearchUrl}
          etsyRecommendationRequestId={wizard.requestId}
          etsySearchUrl={wizard.etsySearchUrl}
          headingRef={wizard.focusHeadingRef}
          isLoadingListings={wizard.isLoadingListings}
          isSearchingAgain={wizard.isSearchingAgain}
          listings={wizard.listings}
          listingsMessage={wizard.listingsMessage}
          previewQuota={wizard.previewQuota}
          onBackToOptions={wizard.backToOptions}
          onEditSearch={wizard.editSearch}
          onSearchAgain={() => {
            void wizard.searchAgain();
          }}
        />
      ) : null}
    </main>
  );
}
