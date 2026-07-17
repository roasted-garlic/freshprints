'use client';

import {
  ASSISTED_CREATION_WIZARD_STEPS,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationAnswers } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

import { AssistedCreationWizardStepFields } from './AssistedCreationWizardStepFields';

interface AssistedCreationWizardProps {
  stepIndex: number;
  stepId: AssistedCreationWizardStepId;
  stepTitle: string;
  answers: AssistedCreationAnswers;
  referenceFiles: File[];
  referenceFilesError: string | null;
  stepError: string | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  submitStatusMessage: string | null;
  onAnswersChange: (
    updater: (current: AssistedCreationAnswers) => AssistedCreationAnswers,
  ) => void;
  onReferenceFilesChange: (files: File[]) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function AssistedCreationWizard({
  stepIndex,
  stepId,
  stepTitle,
  answers,
  referenceFiles,
  referenceFilesError,
  stepError,
  isFirstStep,
  isLastStep,
  isSubmitting,
  submitStatusMessage,
  onAnswersChange,
  onReferenceFilesChange,
  onBack,
  onNext,
  onSubmit,
}: AssistedCreationWizardProps) {
  return (
    <section
      aria-busy={isSubmitting}
      aria-labelledby="assisted-creation-wizard-title"
      className={`etsy-wizard-shell assisted-creation-wizard${isSubmitting ? ' is-submitting' : ''}`}
    >
      <div aria-hidden className="etsy-wizard-progress">
        {ASSISTED_CREATION_WIZARD_STEPS.map((step, index) => (
          <span
            className={`etsy-wizard-progress-segment${
              index <= stepIndex ? ' is-active' : ''
            }`}
            key={step.id}
          />
        ))}
      </div>

      <header className="assisted-creation-wizard-header">
        <p className="etsy-wizard-step-label">
          Step {stepIndex + 1} of {ASSISTED_CREATION_WIZARD_STEPS.length}
        </p>
        <h1 className="etsy-wizard-heading" id="assisted-creation-wizard-title">
          {stepTitle}
        </h1>
      </header>

      {submitStatusMessage ? (
        <p aria-live="polite" className="assisted-creation-submit-status" role="status">
          {submitStatusMessage}
        </p>
      ) : null}

      <div className={isSubmitting ? 'assisted-creation-wizard-body is-disabled' : 'assisted-creation-wizard-body'}>
        <AssistedCreationWizardStepFields
          answers={answers}
          onAnswersChange={onAnswersChange}
          onReferenceFilesChange={onReferenceFilesChange}
          referenceFiles={referenceFiles}
          referenceFilesError={referenceFilesError}
          stepId={stepId}
        />
      </div>

      {stepError ? <p className="portal-form-error">{stepError}</p> : null}

      <footer className="etsy-wizard-actions">
        <button
          className="portal-button portal-button-secondary"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          Back
        </button>

        {isLastStep ? (
          <button
            className="portal-button portal-button-primary"
            disabled={isSubmitting}
            onClick={onSubmit}
            type="button"
          >
            {isSubmitting
              ? submitStatusMessage?.toLowerCase().includes('reference')
                ? 'Uploading…'
                : 'Submitting…'
              : 'Submit request'}
          </button>
        ) : (
          <button
            className="portal-button portal-button-primary"
            disabled={isSubmitting}
            onClick={onNext}
            type="button"
          >
            Next
          </button>
        )}
      </footer>
    </section>
  );
}
