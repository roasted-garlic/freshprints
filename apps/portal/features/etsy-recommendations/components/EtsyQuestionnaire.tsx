'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode, type Ref, type RefObject } from 'react';

import {
  ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_WORDING_LENGTH,
} from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';
import {
  matchSuggestDictionary,
  type EtsyRecommendationSuggestEntry,
} from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestDictionary';
import {
  mergeStyleSuggestionLabels,
  mergeSubjectSuggestEntries,
  type AdminSuggestionOverlay,
} from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists';
import { parseEtsyRecommendationSubjectText } from '@fresh-prints/shared/utils/etsyRecommendationSubjectParser';

import type { EtsyRecommendationAnswersState } from '../hooks/useEtsyRecommendationWizard';
import { loadActiveEtsySuggestionOverlays } from '../services/etsySuggestionListsService';
import {
  applyEtsyMultiValueSuggestion,
  applyEtsySubjectSuggestion,
  listEtsyMultiValueInputValues,
  parseEtsyMultiValueInput,
} from '../utils/applyEtsySubjectSuggestion';
import { EtsyMultiValueInput } from './EtsyMultiValueInput';
import { EtsySaveSuggestionAction } from './EtsySaveSuggestionAction';
import { EtsySuggestionPills } from './EtsySuggestionPills';

const POPULAR_SUGGESTION_LIMIT = 8;
const FILTERED_SUGGESTION_LIMIT = 10;
const MAX_SUBJECT_ITEMS = 3;
const MAX_STYLE_ITEMS = 2;

const SUBJECT_PILL_HINT =
  'Tap a suggestion to add it. Use a comma or Enter to finish your own entry.';
const STYLE_PILL_HINT =
  'Tap a suggestion to add it. Use a comma or Enter to finish your own entry.';

function QuestionnaireWarningCallout({ children, id }: { children: ReactNode; id: string }) {
  return (
    <p className="etsy-questionnaire-warning" id={id} role="note">
      <TriangleAlert aria-hidden className="etsy-questionnaire-warning-icon" size={16} strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

type QuestionnaireScreen = 'screen1' | 'screen2' | 'screen3' | 'review';

interface EtsyQuestionnaireProps {
  answers: EtsyRecommendationAnswersState;
  searchPreview: string;
  fieldError: string | null;
  actionError: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isSubmitting: boolean;
  screen: QuestionnaireScreen;
  onBack: () => void;
  onSubjectTextChange: (value: string) => void;
  onStyleTextChange: (value: string) => void;
  onWordingChange: (value: string) => void;
  onNextFromScreen1: () => void;
  onNextFromScreen2: () => void;
  onNextFromScreen3: () => void;
  onSubmitSearch: () => void;
  onEditDetails: () => void;
}

function WizardShell({
  currentStep,
  heading,
  headingId,
  headingRef,
  stepLabel,
  children,
}: {
  currentStep: number;
  heading: string;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  stepLabel: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="etsy-wizard-panel">
      <p className="etsy-wizard-step-label">{stepLabel}</p>
      <div className="etsy-wizard-progress" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            className={`etsy-wizard-progress-segment${step <= currentStep ? ' is-active' : ''}`}
            key={step}
          />
        ))}
      </div>
      <h2
        className="etsy-wizard-heading"
        id={headingId}
        ref={headingRef as Ref<HTMLHeadingElement>}
        tabIndex={-1}
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}

function WizardActions({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
}: {
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}) {
  return (
    <div className="etsy-wizard-actions">
      <button className="portal-button portal-button-secondary" onClick={onBack} type="button">
        Back
      </button>
      <button
        className="portal-button portal-button-primary"
        disabled={continueDisabled}
        onClick={onContinue}
        type="button"
      >
        {continueLabel}
      </button>
    </div>
  );
}

function matchStyleSuggestions(
  query: string,
  options: readonly string[],
  limit = FILTERED_SUGGESTION_LIMIT,
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return options.slice(0, POPULAR_SUGGESTION_LIMIT);
  }
  return options.filter((style) => style.toLowerCase().includes(needle)).slice(0, limit);
}

function matchesSuggestionLabel(trimmed: string, labels: readonly string[]): boolean {
  const needle = trimmed.toLowerCase();
  return labels.some((label) => label.toLowerCase() === needle);
}

export function EtsyQuestionnaire({
  answers,
  searchPreview,
  fieldError,
  actionError,
  headingRef,
  isSubmitting,
  screen,
  onBack,
  onSubjectTextChange,
  onStyleTextChange,
  onWordingChange,
  onNextFromScreen1,
  onNextFromScreen2,
  onNextFromScreen3,
  onSubmitSearch,
  onEditDetails,
}: EtsyQuestionnaireProps) {
  const [adminOverlays, setAdminOverlays] = useState<AdminSuggestionOverlay[]>([]);

  const refreshOverlays = () => {
    void loadActiveEtsySuggestionOverlays({ forceRefresh: true }).then(setAdminOverlays);
  };

  useEffect(() => {
    let cancelled = false;
    void loadActiveEtsySuggestionOverlays().then((overlays) => {
      if (!cancelled) {
        setAdminOverlays(overlays);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectEntries = useMemo(
    (): readonly EtsyRecommendationSuggestEntry[] => mergeSubjectSuggestEntries(adminOverlays),
    [adminOverlays],
  );

  const styleOptions = useMemo(
    () => mergeStyleSuggestionLabels(adminOverlays),
    [adminOverlays],
  );

  const subjectInput = useMemo(
    () => parseEtsyMultiValueInput(answers.subjectText),
    [answers.subjectText],
  );
  const styleInput = useMemo(
    () => parseEtsyMultiValueInput(answers.styleText),
    [answers.styleText],
  );

  const subjectSuggestions = useMemo(() => {
    const selectedKeys = new Set(
      subjectInput.selected.map((value) => value.trim().toLowerCase()),
    );
    return matchSuggestDictionary(
      subjectInput.draft,
      FILTERED_SUGGESTION_LIMIT,
      subjectEntries,
    ).filter((entry) => !selectedKeys.has(entry.apiToken.trim().toLowerCase()));
  }, [subjectEntries, subjectInput]);

  const styleSuggestions = useMemo(() => {
    const selectedKeys = new Set(
      styleInput.selected.map((value) => value.trim().toLowerCase()),
    );
    return matchStyleSuggestions(
      styleInput.draft,
      styleOptions,
      FILTERED_SUGGESTION_LIMIT,
    ).filter((style) => !selectedKeys.has(style.trim().toLowerCase()));
  }, [styleInput, styleOptions]);

  const subjectPillItems = useMemo(
    () =>
      subjectSuggestions.map((entry) => ({
        id: entry.id,
        label: entry.label,
      })),
    [subjectSuggestions],
  );

  const stylePillItems = useMemo(
    () =>
      styleSuggestions.map((style) => ({
        id: style,
        label: style,
      })),
    [styleSuggestions],
  );

  const parsePreview = useMemo(() => {
    try {
      if (!answers.subjectText.trim()) {
        return '';
      }
      return parseEtsyRecommendationSubjectText(answers.subjectText).previewLabel;
    } catch {
      return '';
    }
  }, [answers.subjectText]);

  const subjectTrimmed = subjectInput.draft.trim();
  const styleTrimmed = styleInput.draft.trim();

  const showSubjectSaveAction =
    subjectTrimmed.length > 0 &&
    !matchesSuggestionLabel(
      subjectTrimmed,
      subjectEntries.flatMap((entry) => [entry.label, entry.apiToken]),
    );

  const showStyleSaveAction =
    styleTrimmed.length > 0 && !matchesSuggestionLabel(styleTrimmed, styleOptions);

  const selectSubjectSuggestion = (index: number) => {
    const entry = subjectSuggestions[index];
    if (!entry) {
      return;
    }
    onSubjectTextChange(applyEtsySubjectSuggestion(answers.subjectText, entry));
  };

  const selectStyleSuggestion = (index: number) => {
    const entry = styleSuggestions[index];
    if (!entry) {
      return;
    }
    onStyleTextChange(
      applyEtsyMultiValueSuggestion(answers.styleText, entry, MAX_STYLE_ITEMS),
    );
  };

  if (screen === 'screen1') {
    return (
      <WizardShell
        currentStep={1}
        heading="Person, place, or thing"
        headingId="etsy-q-screen1-title"
        headingRef={headingRef}
        stepLabel="Step 1 of 3"
      >
        <p className="portal-muted etsy-wizard-lead">
          Add up to {MAX_SUBJECT_ITEMS} clear people, places, or things the design is about (max{' '}
          {ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH} characters). A character, animal, job,
          holiday, decade, or object works. Keep it short.
        </p>
        <div className="portal-field etsy-questionnaire-field">
          <label className="portal-visually-hidden" htmlFor="etsy-subject-text">
            Person, place, or thing
          </label>
          <EtsyMultiValueInput
            ariaDescribedBy="etsy-subject-hint etsy-subject-error"
            ariaInvalid={fieldError ? true : undefined}
            ariaLabelledBy="etsy-q-screen1-title"
            id="etsy-subject-text"
            maxItems={MAX_SUBJECT_ITEMS}
            maxLength={ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH}
            onChange={onSubjectTextChange}
            placeholder="Example: highland cow, Wednesday Addams, doctor, goose…"
            value={answers.subjectText}
          />
          {subjectInput.selected.length < MAX_SUBJECT_ITEMS ? (
            <EtsySuggestionPills
              groupLabel="Person, place, or thing suggestions"
              hint={SUBJECT_PILL_HINT}
              items={subjectPillItems}
              onSelect={selectSubjectSuggestion}
            />
          ) : null}
          {showSubjectSaveAction ? (
            <EtsySaveSuggestionAction
              apiToken={parsePreview || subjectTrimmed}
              kind="subject"
              label={subjectTrimmed}
              onSaved={refreshOverlays}
            />
          ) : null}
          <QuestionnaireWarningCallout id="etsy-subject-hint">
            Keep it short and sharp. A few clear words beat a sentence. Long phrases usually find
            nothing.
          </QuestionnaireWarningCallout>
          {parsePreview ? (
            <p className="etsy-parse-preview" aria-live="polite">
              Parsed for search: <span>{parsePreview}</span>
            </p>
          ) : null}
          {fieldError ? (
            <p className="etsy-field-error" id="etsy-subject-error" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>
        <WizardActions onBack={onBack} onContinue={onNextFromScreen1} />
      </WizardShell>
    );
  }

  if (screen === 'screen2') {
    return (
      <WizardShell
        currentStep={2}
        heading="Tone / style"
        headingId="etsy-q-screen2-title"
        headingRef={headingRef}
        stepLabel="Step 2 of 3"
      >
        <p className="portal-muted etsy-wizard-lead">
          Optional. Add up to {MAX_STYLE_ITEMS} tones or styles (max{' '}
          {ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH} characters). Funny, cute, retro, sarcastic,
          and similar vibes help narrow results.
        </p>
        <div className="portal-field etsy-questionnaire-field">
          <label className="portal-visually-hidden" htmlFor="etsy-style-text">
            Tone / style
          </label>
          <EtsyMultiValueInput
            ariaDescribedBy="etsy-style-hint etsy-style-error"
            ariaInvalid={fieldError ? true : undefined}
            ariaLabelledBy="etsy-q-screen2-title"
            id="etsy-style-text"
            maxItems={MAX_STYLE_ITEMS}
            maxLength={ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH}
            onChange={onStyleTextChange}
            placeholder="Example: Funny, Cute, Sarcastic, Retro…"
            value={answers.styleText}
          />
          {styleInput.selected.length < MAX_STYLE_ITEMS ? (
            <EtsySuggestionPills
              groupLabel="Tone and style suggestions"
              hint={STYLE_PILL_HINT}
              items={stylePillItems}
              onSelect={selectStyleSuggestion}
            />
          ) : null}
          {showStyleSaveAction ? (
            <EtsySaveSuggestionAction
              kind="style"
              label={styleTrimmed}
              onSaved={refreshOverlays}
            />
          ) : null}
          <QuestionnaireWarningCallout id="etsy-style-hint">
            Keep each vibe short, not a paragraph. Unsure? Leave it blank and continue.
          </QuestionnaireWarningCallout>
          {fieldError ? (
            <p className="etsy-field-error" id="etsy-style-error" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>
        <WizardActions onBack={onBack} onContinue={onNextFromScreen2} />
      </WizardShell>
    );
  }

  if (screen === 'screen3') {
    return (
      <WizardShell
        currentStep={3}
        heading="Words or what's happening (optional)"
        headingId="etsy-q-screen3-title"
        headingRef={headingRef}
        stepLabel="Step 3 of 3"
      >
        <p className="portal-muted etsy-wizard-lead">
          If the design has an exact quote, type it. If not, a few words about what&apos;s
          happening (an action or scene) can help. Skip this step when the person/place/thing and
          tone are enough.
        </p>
        <div className="portal-field etsy-questionnaire-field">
          <label htmlFor="etsy-wording">Exact words or scene (optional)</label>
          <input
            aria-describedby="etsy-wording-hint etsy-wording-error"
            aria-invalid={fieldError ? true : undefined}
            id="etsy-wording"
            maxLength={ETSY_RECOMMENDATION_MAX_WORDING_LENGTH}
            onChange={(event) => onWordingChange(event.target.value)}
            placeholder='Quote: "Who knew?" or scene: holding coffee, birthday party…'
            type="text"
            value={answers.wording}
          />
          <QuestionnaireWarningCallout id="etsy-wording-hint">
            Exact quotes can be a bit longer (max {ETSY_RECOMMENDATION_MAX_WORDING_LENGTH}{' '}
            characters), but stay snappy. We search a few distinctive words, not whole paragraphs.
          </QuestionnaireWarningCallout>
          {fieldError ? (
            <p className="etsy-field-error" id="etsy-wording-error" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>
        <WizardActions onBack={onBack} onContinue={onNextFromScreen3} />
      </WizardShell>
    );
  }

  return (
    <WizardShell
      currentStep={4}
      heading="Review your search"
      headingId="etsy-q-review-title"
      headingRef={headingRef}
      stepLabel="Review"
    >
      <dl className="etsy-review-summary">
        <div className="etsy-review-row">
          <dt>Person, place, or thing</dt>
          <dd>{listEtsyMultiValueInputValues(answers.subjectText).join(', ')}</dd>
        </div>
        {answers.styleText.trim() ? (
          <div className="etsy-review-row">
            <dt>Tone / style</dt>
            <dd>{listEtsyMultiValueInputValues(answers.styleText).join(', ')}</dd>
          </div>
        ) : null}
        {answers.wording.trim() ? (
          <div className="etsy-review-row">
            <dt>Words or scene</dt>
            <dd>{answers.wording.trim()}</dd>
          </div>
        ) : null}
        {searchPreview ? (
          <div className="etsy-review-row">
            <dt>We&apos;ll search for</dt>
            <dd className="etsy-review-preview">{searchPreview}</dd>
          </div>
        ) : null}
      </dl>

      {actionError ? (
        <p className="etsy-field-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="etsy-wizard-actions">
        <button
          className="portal-button portal-button-secondary"
          disabled={isSubmitting}
          onClick={onEditDetails}
          type="button"
        >
          Edit details
        </button>
        <button
          className="portal-button portal-button-primary"
          disabled={isSubmitting}
          onClick={onSubmitSearch}
          type="button"
        >
          {isSubmitting ? 'Searching…' : 'Find designs'}
        </button>
      </div>
    </WizardShell>
  );
}
