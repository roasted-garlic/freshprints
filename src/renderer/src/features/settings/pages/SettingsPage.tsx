import { Check, Copy, Paperclip, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH } from "../../../../../../shared/constants/aiEnrichment.constants";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Modal, ModalBody, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  BASE_AI_TAG_EXCLUSIONS,
  ALL_VISION_MODEL_OPTIONS,
  OPENAI_REASONING_EFFORT_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isGeminiModelId,
  resolveClientReasoningEffort,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import { useAiEnrichmentPlayground } from "../hooks/useAiEnrichmentPlayground";
import {
  formatAdditionalTagExclusionsInput,
  parseAdditionalTagExclusionsInput,
  useAiEnrichmentSettings,
} from "../hooks/useAiEnrichmentSettings";
import { formatAiPlaygroundOutput } from "../utils/aiPlaygroundOutputFormatter";

export function SettingsPage() {
  const { user } = useAuth();
  const isOwner = permissionService.isOwner(user);
  const canManageSettings = permissionService.canManageSettings(user);
  const {
    additionalTagExclusions,
    error,
    isLoading,
    isSaving,
    promptTemplate,
    reasoningEffort,
    saveError,
    saveSettings,
    visionModelId,
  } = useAiEnrichmentSettings();
  const playground = useAiEnrichmentPlayground();
  const { resetPlayground } = playground;
  const playgroundImageInputId = useId();
  const playgroundPromptId = useId();
  const playgroundTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [draftVisionModelId, setDraftVisionModelId] = useState<string | null>(null);
  const [draftReasoningEffort, setDraftReasoningEffort] = useState<string | null>(null);
  const [draftPromptTemplate, setDraftPromptTemplate] = useState<string | null>(null);
  const [draftAdditionalTagExclusions, setDraftAdditionalTagExclusions] = useState<string[] | null>(
    null,
  );
  const [isPromptTemplateEditorOpen, setIsPromptTemplateEditorOpen] = useState(false);
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);
  const [isPlaygroundResultModalOpen, setIsPlaygroundResultModalOpen] = useState(false);
  const [hasInjectedProcessingPrompt, setHasInjectedProcessingPrompt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const playgroundResultOutputText = useMemo(
    () => formatAiPlaygroundOutput(playground.result?.outputText ?? ""),
    [playground.result?.outputText],
  );

  const selectedVisionModelId = draftVisionModelId ?? visionModelId;
  const selectedReasoningEffort = draftReasoningEffort ?? reasoningEffort;
  const selectedPromptTemplate = draftPromptTemplate ?? promptTemplate;
  const selectedAdditionalTagExclusions = draftAdditionalTagExclusions ?? additionalTagExclusions;
  const additionalTagExclusionsInput = formatAdditionalTagExclusionsInput(selectedAdditionalTagExclusions);
  const hasUnsavedChanges =
    (draftVisionModelId !== null && draftVisionModelId !== visionModelId) ||
    (draftReasoningEffort !== null && draftReasoningEffort !== reasoningEffort) ||
    (draftPromptTemplate !== null && draftPromptTemplate !== promptTemplate) ||
    (draftAdditionalTagExclusions !== null &&
      formatAdditionalTagExclusionsInput(draftAdditionalTagExclusions) !==
        formatAdditionalTagExclusionsInput(additionalTagExclusions));
  const promptTemplateError = !hasRequiredAiEnrichmentPromptPlaceholders(selectedPromptTemplate)
    ? "Prompt must include {{excluded_tags}} so server-side values are inserted."
    : null;

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Settings",
      description: "Configure platform settings and AI enrichment preferences.",
    }),
    [],
  );

  useShellHeaderConfig(shellHeaderConfig);

  const closePlaygroundModal = useCallback(() => {
    setIsPlaygroundResultModalOpen(false);
    resetPlayground();
    setIsPlaygroundModalOpen(false);
  }, [resetPlayground]);

  const closePlaygroundResultModal = useCallback(() => {
    setIsPlaygroundResultModalOpen(false);
  }, []);

  useEffect(() => {
    if (!isPlaygroundModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePlaygroundModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePlaygroundModal, isPlaygroundModalOpen]);

  useEffect(() => {
    if (playground.result) {
      setIsPlaygroundResultModalOpen(true);
    }
  }, [playground.result]);

  useEffect(() => {
    if (isPlaygroundModalOpen) {
      setHasInjectedProcessingPrompt(false);
    }
  }, [isPlaygroundModalOpen]);

  async function handleSaveSettings() {
    await saveSettings({
      reasoningEffort: resolveClientReasoningEffort(selectedReasoningEffort),
      visionModelId: resolveClientVisionModelId(selectedVisionModelId),
      promptTemplate: selectedPromptTemplate,
      additionalTagExclusions: parseAdditionalTagExclusionsInput(additionalTagExclusionsInput),
    });
    setDraftVisionModelId(null);
    setDraftReasoningEffort(null);
    setDraftPromptTemplate(null);
    setDraftAdditionalTagExclusions(null);
    setIsPromptTemplateEditorOpen(false);
  }

  function handleOpenPromptTemplateEditor() {
    const confirmed = window.confirm(
      "Editing the AI Processing prompt changes the live catalog suggestions generated for future designs. Only continue if you are intentionally changing the production prompt.",
    );

    if (confirmed) {
      setIsPromptTemplateEditorOpen(true);
    }
  }

  function handleClosePromptTemplateEditor() {
    if (draftPromptTemplate !== null && draftPromptTemplate !== promptTemplate) {
      const confirmed = window.confirm("Discard unsaved AI Processing prompt changes?");

      if (!confirmed) {
        return;
      }

      setDraftPromptTemplate(null);
    }

    setIsPromptTemplateEditorOpen(false);
  }

  return (
    <main className="page-layout page-layout-shell settings-page">
      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {saveError ? (
        <p className="auth-message auth-message-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <section aria-labelledby="ai-enrichment-settings-title" className="card settings-section">
        <header className="settings-section-header">
          <h2 className="settings-section-title" id="ai-enrichment-settings-title">
            AI Enrichment
          </h2>
          <p className="settings-section-description">
            Choose the OpenAI vision model and team tag exclusions used for catalog title,
            description, category, tags, and OCR. Applies on the next AI processing run.
          </p>
        </header>

        {isLoading ? (
          <p className="settings-section-status">Loading AI enrichment settings…</p>
        ) : (
          <div className="settings-form-grid">
            <Select
              disabled={!canManageSettings || isSaving}
              label="Vision model"
              name="visionModelId"
              onChange={(event) => setDraftVisionModelId(event.target.value)}
              options={ALL_VISION_MODEL_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              value={selectedVisionModelId}
            />

            <p className="settings-field-hint">
              {ALL_VISION_MODEL_OPTIONS.find((option) => option.value === selectedVisionModelId)
                ?.hint ?? selectedVisionModelId}
            </p>

            {!isGeminiModelId(selectedVisionModelId) ? (
              <>
                <Select
                  disabled={!canManageSettings || isSaving}
                  label="Reasoning effort"
                  name="reasoningEffort"
                  onChange={(event) => setDraftReasoningEffort(event.target.value)}
                  options={OPENAI_REASONING_EFFORT_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  value={selectedReasoningEffort}
                />

                <p className="settings-field-hint">
                  {OPENAI_REASONING_EFFORT_OPTIONS.find(
                    (option) => option.value === selectedReasoningEffort,
                  )?.hint ?? selectedReasoningEffort}
                </p>
              </>
            ) : (
              <div className="form-field">
                <label>Reasoning effort</label>
                <div className="form-input-shell form-select-shell">
                  <button className="form-select-trigger" disabled type="button">
                    <span className="form-select-value">Not applicable for Gemini models</span>
                  </button>
                </div>
              </div>
            )}

            {isOwner ? (
              <div className="settings-prompt-template-block settings-prompt-template-danger">
                <div className="settings-prompt-template-summary">
                  <div className="settings-prompt-template-copy">
                    <h3 className="settings-subsection-title">AI Processing prompt</h3>
                    <p className="settings-field-hint">
                      This prompt drives live AI Processing output. Keep it collapsed unless you are
                      intentionally changing the production prompt.
                    </p>
                  </div>

                  {isPromptTemplateEditorOpen ? (
                    <Button
                      disabled={isSaving}
                      onClick={handleClosePromptTemplateEditor}
                      variant="secondary"
                    >
                      Hide prompt editor
                    </Button>
                  ) : (
                    <Button
                      disabled={!canManageSettings || isSaving}
                      onClick={handleOpenPromptTemplateEditor}
                      variant="warning"
                    >
                      Unlock prompt editor
                    </Button>
                  )}
                </div>

                {isPromptTemplateEditorOpen ? (
                  <>
                    <AutoResizeTextarea
                      disabled={!canManageSettings || isSaving}
                      label="AI Processing prompt"
                      maxLength={AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH}
                      name="promptTemplate"
                      onChange={(event) => setDraftPromptTemplate(event.target.value)}
                      value={selectedPromptTemplate}
                    />
                    <p className="settings-field-hint">
                      This prompt is used by AI Processing only. The AI Playground remains a one-off
                      test tool.
                    </p>
                    {promptTemplateError ? (
                      <p className="auth-message auth-message-error" role="alert">
                        {promptTemplateError}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="settings-tag-exclusions-block">
              <h3 className="settings-subsection-title">Tag exclusions</h3>
              <p className="settings-field-hint">
                Built-in exclusions always apply. Add team-specific single-word tags to block from AI
                suggestions.
              </p>

              <div className="settings-tag-chip-row" aria-label="Built-in tag exclusions">
                {BASE_AI_TAG_EXCLUSIONS.map((tag: string) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>

              <TagChipInput
                adjustmentHint="Single-word lowercase tags only. Duplicates and built-in exclusions are ignored."
                disabled={!canManageSettings || isSaving}
                label="Additional exclusions"
                name="additionalTagExclusions"
                onChange={(value) =>
                  setDraftAdditionalTagExclusions(parseAdditionalTagExclusionsInput(value))
                }
                value={additionalTagExclusionsInput}
              />
            </div>

            {canManageSettings ? (
              <div className="settings-card-footer">
                <div className="settings-form-actions">
                  <Button
                    disabled={!hasUnsavedChanges || isSaving || Boolean(promptTemplateError)}
                    onClick={() => void handleSaveSettings()}
                    variant="primary"
                  >
                    {isSaving ? "Saving…" : "Save AI enrichment settings"}
                  </Button>
                </div>

                <div className="settings-card-aside">
                  <Button onClick={() => setIsPlaygroundModalOpen(true)} variant="secondary">
                    Open AI Playground
                  </Button>
                </div>
              </div>
            ) : (
              <p className="settings-section-status">
                Only owners and admins can change AI enrichment settings.
              </p>
            )}
          </div>
        )}
      </section>

      {canManageSettings && isPlaygroundModalOpen ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={closePlaygroundModal}
        >
          <div
            className="settings-playground-modal-shell"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <Modal
              aria-labelledby="ai-playground-title"
              className="modal-panel modal-panel-lg settings-playground-modal"
              role="dialog"
            >
              <ModalHeader className="settings-playground-modal-header">
                <div className="settings-playground-modal-title-group">
                  <h2 className="settings-section-title" id="ai-playground-title">
                    AI Playground
                  </h2>
                  <p className="settings-section-description">
                    Test a one-off text + image prompt through Cloud Functions. This does not change
                    saved AI settings or write to designs.
                  </p>
                </div>

                <button
                  aria-label="Close AI playground"
                  className="icon-button icon-button-md icon-button-ghost"
                  onClick={closePlaygroundModal}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2.2} />
                </button>
              </ModalHeader>

              <ModalBody className="settings-playground-modal-body">
                <div className="settings-playground-grid">
                  <div className="settings-playground-controls">
                    <Select
                      disabled={playground.isRunning}
                      label="Playground model"
                      name="playgroundVisionModelId"
                      onChange={(event) => playground.setVisionModelId(event.target.value)}
                      options={ALL_VISION_MODEL_OPTIONS.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      value={playground.visionModelId}
                    />

                    {!isGeminiModelId(playground.visionModelId) ? (
                      <Select
                        disabled={playground.isRunning}
                        label="Playground reasoning effort"
                        name="playgroundReasoningEffort"
                        onChange={(event) => playground.setReasoningEffort(event.target.value)}
                        options={OPENAI_REASONING_EFFORT_OPTIONS.map((option) => ({
                          label: option.label,
                          value: option.value,
                        }))}
                        value={playground.reasoningEffort}
                      />
                    ) : (
                      <div className="form-field">
                        <label>Playground reasoning effort</label>
                        <div className="form-input-shell form-select-shell">
                          <button className="form-select-trigger" disabled type="button">
                            <span className="form-select-value">Not applicable for Gemini models</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="settings-playground-composer">
                    <div className="settings-playground-prompt-field">
                      <div className="settings-playground-prompt-header">
                        <label htmlFor={playgroundPromptId}>Prompt</label>
                        <Button
                          disabled={playground.isRunning || hasInjectedProcessingPrompt}
                          onClick={() => {
                            playground.setPrompt(selectedPromptTemplate);
                            setHasInjectedProcessingPrompt(true);

                            requestAnimationFrame(() => {
                              playgroundTextareaRef.current?.focus({ preventScroll: true });
                              playgroundTextareaRef.current?.scrollIntoView({
                                block: "nearest",
                              });
                            });
                          }}
                          size="sm"
                          variant="secondary"
                        >
                          <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                          Use prompt
                        </Button>
                      </div>

                      <AutoResizeTextarea
                        ref={playgroundTextareaRef}
                        className="settings-playground-textarea"
                        disabled={playground.isRunning}
                        id={playgroundPromptId}
                        maxAutoHeightPx={360}
                        maxLength={AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH}
                        name="playgroundPrompt"
                        onChange={(event) => playground.setPrompt(event.target.value)}
                        placeholder="Describe the artwork, extract text, or request JSON output for inspection."
                        scrollToCaretOnInput
                        value={playground.prompt}
                      />
                    </div>

                    <div className="settings-playground-prompt-actions">
                      <input
                        accept={playground.acceptedImageTypes}
                        className="visually-hidden"
                        disabled={playground.isRunning}
                        id={playgroundImageInputId}
                        name="playgroundImage"
                        onChange={(event) => {
                          playground.setSelectedImage(event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";

                          requestAnimationFrame(() => {
                            playgroundTextareaRef.current?.focus({ preventScroll: true });
                            playgroundTextareaRef.current?.scrollIntoView({
                              block: "nearest",
                            });
                          });
                        }}
                        type="file"
                      />

                      <label
                        aria-label="Attach image to AI playground prompt"
                        className="icon-button icon-button-md icon-button-ghost settings-playground-attach-button"
                        htmlFor={playgroundImageInputId}
                      >
                        <Paperclip aria-hidden="true" size={18} strokeWidth={2.2} />
                      </label>
                    </div>

                    <div className="settings-playground-composer-footer">
                      <div className="settings-playground-upload-state">
                        <p className="settings-field-hint">
                          PNG, JPEG, or WebP up to 50 MB. The file is processed transiently on the
                          server and is not stored.
                        </p>

                        {playground.imageName && playground.imageSizeLabel ? (
                          <div className="settings-playground-upload-summary">
                            <div className="settings-playground-upload-details">
                              <span
                                className="settings-playground-upload-name"
                                title={playground.imageName}
                              >
                                {playground.imageName}
                              </span>
                              <span className="settings-playground-upload-size">
                                · {playground.imageSizeLabel}
                              </span>
                            </div>
                            <Button
                              disabled={playground.isRunning}
                              onClick={playground.clearSelectedImage}
                              size="sm"
                              variant="ghost"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="settings-form-actions">
                        <Button
                          disabled={playground.isRunning}
                          onClick={() => void playground.runPlayground()}
                          variant="primary"
                        >
                          {playground.isRunning ? "Running…" : "Run AI playground"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {playground.error ? (
                    <p className="auth-message auth-message-error" role="alert">
                      {playground.error}
                    </p>
                  ) : null}

                </div>
              </ModalBody>
            </Modal>
          </div>
        </div>
      ) : null}

      {canManageSettings && isPlaygroundResultModalOpen && playground.result ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={closePlaygroundResultModal}
        >
          <div
            className="settings-playground-result-modal-shell"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <Modal
              aria-labelledby="ai-playground-result-title"
              className="modal-panel modal-panel-lg settings-playground-result-modal"
              role="dialog"
            >
              <ModalHeader className="settings-playground-result-modal-header">
                <div className="settings-playground-modal-title-group">
                  <h2 className="settings-section-title" id="ai-playground-result-title">
                    AI Playground Result
                  </h2>
                  <p className="settings-section-description">
                    Result output from the latest playground run.
                  </p>
                </div>

                <button
                  aria-label="Close AI playground result"
                  className="icon-button icon-button-md icon-button-ghost"
                  onClick={closePlaygroundResultModal}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2.2} />
                </button>
              </ModalHeader>

              <ModalBody className="settings-playground-result-modal-body">
                <section className="settings-playground-result" aria-label="AI playground result">
                  <dl className="settings-playground-result-meta">
                    <div>
                      <dt>Provider</dt>
                      <dd>{playground.result.provider}</dd>
                    </div>
                    <div>
                      <dt>Model used</dt>
                      <dd>{playground.result.visionModelId}</dd>
                    </div>
                    <div>
                      <dt>Requested reasoning</dt>
                      <dd>{playground.result.reasoningEffortRequested}</dd>
                    </div>
                    <div>
                      <dt>Applied reasoning</dt>
                      <dd>{playground.result.reasoningEffortApplied ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Elapsed</dt>
                      <dd>{playground.result.elapsedMs} ms</dd>
                    </div>
                    <div>
                      <dt>Input tokens</dt>
                      <dd>{playground.result.promptTokens ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Output tokens</dt>
                      <dd>{playground.result.completionTokens ?? "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Estimated cost</dt>
                      <dd>
                        {playground.result.estimatedCostUsd != null
                          ? `$${playground.result.estimatedCostUsd.toFixed(6)}`
                          : "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt>Playground version</dt>
                      <dd>{playground.result.version}</dd>
                    </div>
                  </dl>

                  <div className="settings-playground-output">
                    <div className="settings-playground-output-header">
                      <h3 className="settings-subsection-title">Response output</h3>
                      <button
                        aria-label="Copy response output"
                        className="icon-button icon-button-sm icon-button-ghost"
                        onClick={() => {
                          void navigator.clipboard.writeText(playgroundResultOutputText).then(() => {
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          });
                        }}
                        type="button"
                      >
                        {isCopied
                          ? <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                          : <Copy aria-hidden="true" size={15} strokeWidth={2.2} />}
                      </button>
                    </div>
                    <pre>{playgroundResultOutputText}</pre>
                  </div>
                </section>
              </ModalBody>
            </Modal>
          </div>
        </div>
      ) : null}
    </main>
  );
}
