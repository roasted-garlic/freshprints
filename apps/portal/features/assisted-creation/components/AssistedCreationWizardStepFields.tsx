'use client';

import type { AssistedCreationAnswers } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import {
  ASSISTED_CREATION_COMPOSITION_OPTIONS,
  ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS,
  ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_FLEXIBILITY_OPTIONS,
  ASSISTED_CREATION_MAX_MOOD_ITEMS,
  ASSISTED_CREATION_MAX_STYLE_PREFERENCES,
  ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
  ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS,
  ASSISTED_CREATION_REQUEST_TYPE_OPTIONS,
  ASSISTED_CREATION_STYLE_OPTIONS,
  type AssistedCreationPersonalizationType,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import { buildAssistedCreationAnswerDisplayRows } from '@fresh-prints/shared/utils/assistedCreationAnswerDisplay';

import { EtsyMultiValueInput } from '../../etsy-recommendations/components/EtsyMultiValueInput';
import { AssistedCreationReferenceUpload } from './AssistedCreationReferenceUpload';
import { applyContainsTextSelection } from '../utils/applyContainsTextSelection';

interface AssistedCreationWizardStepFieldsProps {
  stepId: AssistedCreationWizardStepId;
  answers: AssistedCreationAnswers;
  referenceFiles: File[];
  onAnswersChange: (
    updater: (current: AssistedCreationAnswers) => AssistedCreationAnswers,
  ) => void;
  onReferenceFilesChange: (files: File[]) => void;
  referenceFilesError: string | null;
}

function toggleValue<T extends string>(values: T[], value: T, maxSelected?: number): T[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  if (typeof maxSelected === 'number' && values.length >= maxSelected) {
    return values;
  }
  return [...values, value];
}

function togglePersonalization(
  current: AssistedCreationPersonalizationType[],
  value: AssistedCreationPersonalizationType,
): AssistedCreationPersonalizationType[] {
  if (value === 'no_personalization') {
    return ['no_personalization'];
  }
  const withoutNone = current.filter((item) => item !== 'no_personalization');
  const next = toggleValue(withoutNone, value);
  return next.length === 0 ? ['no_personalization'] : next;
}

export function AssistedCreationWizardStepFields({
  stepId,
  answers,
  referenceFiles,
  onAnswersChange,
  onReferenceFilesChange,
  referenceFilesError,
}: AssistedCreationWizardStepFieldsProps) {
  switch (stepId) {
    case 'description':
      return (
        <div className="assisted-creation-step-fields">
          <label className="portal-field">
            <span>In your own words, what should this design look like?</span>
            <textarea
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.rawDescription}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, rawDescription: event.target.value }))
              }
              placeholder="Example: A cheetah floating in a pool tube with a funny summer phrase."
              rows={6}
              value={answers.rawDescription}
            />
          </label>
          <p className="portal-muted assisted-creation-field-note">
            Start broad — we will ask follow-up questions next. Do not worry about perfect wording yet.
          </p>
        </div>
      );

    case 'requestType':
      return (
        <fieldset className="assisted-creation-option-group">
          <legend className="portal-visually-hidden">Request type</legend>
          {ASSISTED_CREATION_REQUEST_TYPE_OPTIONS.map((option) => (
            <label
              className={`assisted-creation-option-card${
                answers.requestType === option.value ? ' is-selected' : ''
              }`}
              key={option.value}
            >
              <input
                checked={answers.requestType === option.value}
                name="requestType"
                onChange={() =>
                  onAnswersChange((current) => ({ ...current, requestType: option.value }))
                }
                type="radio"
              />
              <span className="assisted-creation-option-card-copy">
                <strong>{option.label}</strong>
                <span className="portal-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      );

    case 'wording':
      return (
        <div className="assisted-creation-step-fields">
          <fieldset className="assisted-creation-option-group">
            <legend className="portal-visually-hidden">Words on the design</legend>
            {ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS.map((option) => (
              <div className="assisted-creation-option-block" key={option.value}>
                <label
                  className={`assisted-creation-option-card${
                    answers.containsText === option.value ? ' is-selected' : ''
                  }`}
                >
                  <input
                    checked={answers.containsText === option.value}
                    name="containsText"
                    onChange={() =>
                      onAnswersChange((current) =>
                        applyContainsTextSelection(current, option.value),
                      )
                    }
                    type="radio"
                  />
                  <span className="assisted-creation-option-card-copy">
                    <strong>{option.label}</strong>
                  </span>
                </label>

                {option.value === 'exact_wording' && answers.containsText === 'exact_wording' ? (
                  <div className="assisted-creation-nested-fields">
                    <label className="portal-field">
                      <span>Exact wording</span>
                      <textarea
                        maxLength={ASSISTED_CREATION_FIELD_LIMITS.exactText}
                        onChange={(event) =>
                          onAnswersChange((current) => ({
                            ...current,
                            exactText: event.target.value,
                          }))
                        }
                        rows={4}
                        value={answers.exactText}
                      />
                    </label>
                    <label className="portal-field">
                      <span>Capitalization notes (optional)</span>
                      <input
                        maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
                        onChange={(event) =>
                          onAnswersChange((current) => ({
                            ...current,
                            textCapitalizationNotes: event.target.value,
                          }))
                        }
                        type="text"
                        value={answers.textCapitalizationNotes}
                      />
                    </label>
                    <label className="portal-field">
                      <span>Punctuation notes (optional)</span>
                      <input
                        maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
                        onChange={(event) =>
                          onAnswersChange((current) => ({
                            ...current,
                            textPunctuationNotes: event.target.value,
                          }))
                        }
                        type="text"
                        value={answers.textPunctuationNotes}
                      />
                    </label>
                    <label className="assisted-creation-checkbox">
                      <input
                        checked={answers.textLineBreaksExact}
                        onChange={(event) =>
                          onAnswersChange((current) => ({
                            ...current,
                            textLineBreaksExact: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <span>Line breaks must match exactly</span>
                    </label>
                    <label className="assisted-creation-checkbox">
                      <input
                        checked={answers.textLayoutFlexible}
                        onChange={(event) =>
                          onAnswersChange((current) => ({
                            ...current,
                            textLayoutFlexible: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <span>Text layout can be adjusted for readability</span>
                    </label>
                  </div>
                ) : null}
              </div>
            ))}
          </fieldset>
        </div>
      );

    case 'subject':
      return (
        <div className="assisted-creation-step-fields">
          <label className="portal-field">
            <span>Primary subject</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.subject}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, primarySubject: event.target.value }))
              }
              placeholder="Example: cheetah, school mascot, sunflower"
              type="text"
              value={answers.primarySubject}
            />
          </label>
          <label className="portal-field">
            <span>Additional subjects (optional)</span>
            <textarea
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.mediumText}
              onChange={(event) =>
                onAnswersChange((current) => ({
                  ...current,
                  additionalSubjects: event.target.value,
                }))
              }
              rows={3}
              value={answers.additionalSubjects}
            />
          </label>
          <label className="portal-field">
            <span>What is the subject doing? (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, subjectAction: event.target.value }))
              }
              type="text"
              value={answers.subjectAction}
            />
          </label>
          <label className="portal-field">
            <span>Props or accessories (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, props: event.target.value }))
              }
              type="text"
              value={answers.props}
            />
          </label>
          <label className="portal-field">
            <span>Setting or scene (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.mediumText}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, setting: event.target.value }))
              }
              placeholder="e.g. farm, beach — or 'solid light blue background' if you want a fill that prints"
              type="text"
              value={answers.setting}
            />
          </label>
          <p className="portal-muted assisted-creation-field-note">
            Designs use a transparent cut-out by default. If you want a colored background, say so
            clearly above — that background will print as part of the design.
          </p>
        </div>
      );

    case 'occasionAudience':
      return (
        <div className="assisted-creation-step-fields">
          <label className="portal-field">
            <span>Occasion (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, occasion: event.target.value }))
              }
              placeholder="Example: birthday, Christmas, nurse week"
              type="text"
              value={answers.occasion}
            />
          </label>
          <label className="portal-field">
            <span>Who is this for? (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, audience: event.target.value }))
              }
              placeholder="Example: teacher, mom, baseball team"
              type="text"
              value={answers.audience}
            />
          </label>
        </div>
      );

    case 'personalization':
      return (
        <div className="assisted-creation-step-fields">
          <fieldset className="assisted-creation-checkbox-list">
            <legend>Personalization types</legend>
            {ASSISTED_CREATION_PERSONALIZATION_OPTIONS.map((option) => (
              <label className="assisted-creation-checkbox" key={option.value}>
                <input
                  checked={answers.personalizationTypes.includes(option.value)}
                  onChange={() =>
                    onAnswersChange((current) => ({
                      ...current,
                      personalizationTypes: togglePersonalization(
                        current.personalizationTypes,
                        option.value,
                      ),
                    }))
                  }
                  type="checkbox"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <p className="portal-muted assisted-creation-field-note">
            Required. &ldquo;No personalization&rdquo; is selected by default — change it if names,
            dates, or other details should appear.
          </p>
        </div>
      );

    case 'exactnessFlexibility':
      return (
        <div className="assisted-creation-step-fields">
          <p className="portal-muted assisted-creation-field-note">
            This helps staff know how closely to follow your brief. If you upload reference images
            later, you can mark which parts must stay exact.
          </p>
          <fieldset className="assisted-creation-option-group">
            <legend>How flexible are you about the final look?</legend>
            {ASSISTED_CREATION_FLEXIBILITY_OPTIONS.map((option) => (
              <label
                className={`assisted-creation-option-card${
                  answers.flexibilityLevel === option.value ? ' is-selected' : ''
                }`}
                key={option.value}
              >
                <input
                  checked={answers.flexibilityLevel === option.value}
                  name="flexibilityLevel"
                  onChange={() =>
                    onAnswersChange((current) => ({
                      ...current,
                      flexibilityLevel: option.value,
                    }))
                  }
                  type="radio"
                />
                <span className="assisted-creation-option-card-copy">
                  <strong>{option.label}</strong>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      );

    case 'styleMood': {
      const selectedCount = answers.stylePreferences.length;
      const atLimit = selectedCount >= ASSISTED_CREATION_MAX_STYLE_PREFERENCES;
      return (
        <div className="assisted-creation-step-fields">
          <fieldset className="assisted-creation-pill-fieldset">
            <legend>
              Style preferences (optional) —{' '}
              {atLimit
                ? `maximum ${ASSISTED_CREATION_MAX_STYLE_PREFERENCES} selected`
                : `select up to ${ASSISTED_CREATION_MAX_STYLE_PREFERENCES}`}
            </legend>
            <div className="assisted-creation-pill-row">
              {ASSISTED_CREATION_STYLE_OPTIONS.map((option) => {
                const selected = answers.stylePreferences.includes(option.value);
                const disabled = atLimit && !selected;
                return (
                  <label
                    className={`assisted-creation-pill${selected ? ' is-selected' : ''}${
                      disabled ? ' is-disabled' : ''
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={selected}
                      className="portal-visually-hidden"
                      disabled={disabled}
                      onChange={() =>
                        onAnswersChange((current) => ({
                          ...current,
                          stylePreferences: toggleValue(
                            current.stylePreferences,
                            option.value,
                            ASSISTED_CREATION_MAX_STYLE_PREFERENCES,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="portal-field assisted-creation-multi-value-field">
            <span id="assisted-creation-mood-label">Mood or vibe (optional)</span>
            <EtsyMultiValueInput
              ariaDescribedBy="assisted-creation-mood-hint"
              ariaLabelledBy="assisted-creation-mood-label"
              id="assisted-creation-mood"
              maxItems={ASSISTED_CREATION_MAX_MOOD_ITEMS}
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
              onChange={(mood) => onAnswersChange((current) => ({ ...current, mood }))}
              placeholder="Example: playful, heartfelt, bold"
              value={answers.mood}
            />
            <p className="portal-muted assisted-creation-field-hint" id="assisted-creation-mood-hint">
              Type a word and press Enter or comma. Optional — up to{' '}
              {ASSISTED_CREATION_MAX_MOOD_ITEMS} vibes.
            </p>
          </div>
        </div>
      );
    }
    case 'colorsGarment':
      return (
        <div className="assisted-creation-step-fields">
          <label className="portal-field">
            <span>Colors to include (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.colorList}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, includedColors: event.target.value }))
              }
              placeholder="Example: navy, gold, white"
              type="text"
              value={answers.includedColors}
            />
          </label>
          <label className="portal-field">
            <span>Colors to avoid (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.colorList}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, excludedColors: event.target.value }))
              }
              type="text"
              value={answers.excludedColors}
            />
          </label>
          <label className="portal-field">
            <span>Garment color (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.shortText}
              onChange={(event) =>
                onAnswersChange((current) => ({ ...current, garmentColor: event.target.value }))
              }
              placeholder="Example: black tee, heather gray hoodie"
              type="text"
              value={answers.garmentColor}
            />
          </label>
        </div>
      );

    case 'composition':
      return (
        <fieldset className="assisted-creation-option-group">
          <legend className="portal-visually-hidden">Composition</legend>
          {ASSISTED_CREATION_COMPOSITION_OPTIONS.map((option) => (
            <label
              className={`assisted-creation-option-card${
                answers.composition === option.value ? ' is-selected' : ''
              }`}
              key={option.value}
            >
              <input
                checked={answers.composition === option.value}
                name="composition"
                onChange={() =>
                  onAnswersChange((current) => ({ ...current, composition: option.value }))
                }
                type="radio"
              />
              <span className="assisted-creation-option-card-copy">
                <strong>{option.label}</strong>
              </span>
            </label>
          ))}
        </fieldset>
      );

    case 'references':
      return (
        <div className="assisted-creation-step-fields">
          <label className="assisted-creation-checkbox">
            <input
              checked={answers.hasReferences}
              onChange={(event) =>
                onAnswersChange((current) => ({
                  ...current,
                  hasReferences: event.target.checked,
                  referenceUsage: event.target.checked ? current.referenceUsage : [],
                  exactRequirements: event.target.checked ? current.exactRequirements : [],
                }))
              }
              type="checkbox"
            />
            <span>I have reference images or examples in mind</span>
          </label>

          {answers.hasReferences ? (
            <>
              <fieldset className="assisted-creation-checkbox-list">
                <legend>How would references be used?</legend>
                {ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS.map((option) => (
                  <label className="assisted-creation-checkbox" key={option.value}>
                    <input
                      checked={answers.referenceUsage.includes(option.value)}
                      onChange={() =>
                        onAnswersChange((current) => ({
                          ...current,
                          referenceUsage: toggleValue(current.referenceUsage, option.value),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="assisted-creation-checkbox-list">
                <legend>Which parts must match the references? (optional)</legend>
                {ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS.map((option) => (
                  <label className="assisted-creation-checkbox" key={option.value}>
                    <input
                      checked={answers.exactRequirements.includes(option.value)}
                      onChange={() =>
                        onAnswersChange((current) => ({
                          ...current,
                          exactRequirements: toggleValue(current.exactRequirements, option.value),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <AssistedCreationReferenceUpload
                error={referenceFilesError}
                files={referenceFiles}
                onChange={onReferenceFilesChange}
              />
            </>
          ) : null}
        </div>
      );

    case 'review':
      return (
        <div className="assisted-creation-review">
          <p className="portal-muted assisted-creation-field-note">
            Review your answers below. Fresh Prints will create a design and send you a proof to
            approve or revise.
          </p>
          <dl className="assisted-creation-review-list">
            {answers.rawDescription.trim() ? (
              <div>
                <dt>Description</dt>
                <dd>{answers.rawDescription}</dd>
              </div>
            ) : null}
            {buildAssistedCreationAnswerDisplayRows(answers).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
            <div>
              <dt>References</dt>
              <dd>
                {answers.hasReferences
                  ? `${referenceFiles.length} file(s) selected`
                  : 'None'}
              </dd>
            </div>
          </dl>
        </div>
      );

    default:
      return null;
  }
}
