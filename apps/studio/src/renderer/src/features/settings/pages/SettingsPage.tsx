import { Check, ChevronDown, Copy, Paperclip, Settings, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH } from "@fresh-prints/shared/constants/aiEnrichment.constants";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { EmailProviderSettingsSection } from "../components/EmailProviderSettingsSection";
import { CustomerUploadQuotaSettingsSection } from "../components/CustomerUploadQuotaSettingsSection";
import { PortalSocialMetaSettingsSection } from "../components/PortalSocialMetaSettingsSection";
import { BrandLogoSettingsSection } from "../components/BrandLogoSettingsSection";
import { PrintRequestLimitSettingsSection } from "../components/PrintRequestLimitSettingsSection";
import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH,
  BASE_AI_TAG_EXCLUSIONS,
  ALL_VISION_MODEL_OPTIONS,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  SUGGESTED_NEW_TAGS_POLICY_OPTIONS,
  SUGGESTION_AUTHOR_MODE_OPTIONS,
  TAG_RERANK_MODE_OPTIONS,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientPromptTemplate,
  resolveClientSuggestedNewTagsPolicy,
  resolveClientSuggestionAuthorMode,
  resolveClientTagRerankMode,
  resolveClientTagRerankPromptTemplate,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import { useAiEnrichmentPlayground } from "../hooks/useAiEnrichmentPlayground";
import { useAiEnrichmentTagRerankPlayground } from "../hooks/useAiEnrichmentTagRerankPlayground";
import {
  formatAdditionalTagExclusionsInput,
  parseAdditionalTagExclusionsInput,
  useAiEnrichmentSettings,
} from "../hooks/useAiEnrichmentSettings";
import { formatAiPlaygroundOutput } from "../utils/aiPlaygroundOutputFormatter";

/**
 * Tolerantly extract a JSON object from raw model output that may include a fenced code block
 * or surrounding prose — mirrors functions/src/ai/simpleCatalogEnrichmentResponse.ts's
 * extractJsonObject (not importable here since it lives outside shared/), so the enable/disable
 * check for "Run tag rerank" matches what the server-side callable will actually be able to
 * parse instead of requiring perfectly bare JSON.
 */
function extractClientJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();

  const tryParse = (candidate: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    const fromFence = tryParse(fenceMatch[1].trim());
    if (fromFence) {
      return fromFence;
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const fromBlock = tryParse(trimmed.slice(firstBrace, lastBrace + 1));
    if (fromBlock) {
      return fromBlock;
    }
  }

  return null;
}

function isValidFirstCallJson(outputText: string): boolean {
  try {
    const parsed = extractClientJsonObject(outputText);
    return (
      typeof parsed?.title === "string" &&
      typeof parsed?.description === "string" &&
      typeof parsed?.category === "string" &&
      Array.isArray(parsed?.tags)
    );
  } catch {
    return false;
  }
}

type SettingsPageTabId =
  | "emailProviders"
  | "uploadQuotas"
  | "printRequestLimits"
  | "socialSharing"
  | "brandLogos"
  | "aiEnrichment";

interface SettingsPageTab {
  id: SettingsPageTabId;
  label: string;
}

export function SettingsPage() {
  const { user } = useAuth();
  const isOwner = permissionService.isOwner(user);
  const canManageSettings = permissionService.canManageSettings(user);
  const canManageEmailProviders = permissionService.canManageEmailProviders(user);
  const canManageCustomerUploadQuotas = permissionService.canManageCustomerUploadQuotas(user);
  const settingsTabs = useMemo((): SettingsPageTab[] => {
    const tabs: SettingsPageTab[] = [];

    if (canManageEmailProviders) {
      tabs.push({ id: "emailProviders", label: "Email Providers" });
    }

    if (canManageCustomerUploadQuotas) {
      tabs.push({ id: "uploadQuotas", label: "Upload quotas" });
      tabs.push({ id: "printRequestLimits", label: "Print request limits" });
    }

    if (isOwner) {
      tabs.push({ id: "socialSharing", label: "Social sharing" });
      tabs.push({ id: "brandLogos", label: "Brand logos" });
    }

    tabs.push({ id: "aiEnrichment", label: "AI Enrichment" });
    return tabs;
  }, [canManageCustomerUploadQuotas, canManageEmailProviders, isOwner]);
  const [activeTab, setActiveTab] = useState<SettingsPageTabId | null>(null);
  const resolvedTab: SettingsPageTabId =
    activeTab && settingsTabs.some((tab) => tab.id === activeTab)
      ? activeTab
      : (settingsTabs[0]?.id ?? "aiEnrichment");
  const {
    additionalTagExclusions,
    error,
    isLoading,
    isSaving,
    promptTemplate,
    tagRerankPromptTemplate,
    saveError,
    saveSettings,
    suggestionAuthorMode,
    suggestedNewTagsPolicy,
    tagRerankMode,
    visionModelId,
  } = useAiEnrichmentSettings();
  const playground = useAiEnrichmentPlayground();
  const { resetPlayground } = playground;
  const tagRerankPlayground = useAiEnrichmentTagRerankPlayground();
  const { reset: resetTagRerankPlayground } = tagRerankPlayground;
  const playgroundImageInputId = useId();
  const playgroundPromptId = useId();
  const playgroundPromptMenuId = useId();
  const playgroundTextareaRef = useRef<HTMLTextAreaElement>(null);
  const playgroundPromptMenuRef = useRef<HTMLDivElement>(null);
  const [isPromptMenuOpen, setIsPromptMenuOpen] = useState(false);
  const [draftVisionModelId, setDraftVisionModelId] = useState<string | null>(null);
  const [draftPromptTemplate, setDraftPromptTemplate] = useState<string | null>(null);
  const [draftTagRerankPromptTemplate, setDraftTagRerankPromptTemplate] = useState<string | null>(
    null,
  );
  const [draftAdditionalTagExclusions, setDraftAdditionalTagExclusions] = useState<string[] | null>(
    null,
  );
  const [draftTagRerankMode, setDraftTagRerankMode] = useState<string | null>(null);
  const [draftSuggestionAuthorMode, setDraftSuggestionAuthorMode] = useState<string | null>(null);
  const [draftSuggestedNewTagsPolicy, setDraftSuggestedNewTagsPolicy] = useState<string | null>(
    null,
  );
  const [isPromptTemplateEditorOpen, setIsPromptTemplateEditorOpen] = useState(false);
  const [isTagRerankPromptEditorOpen, setIsTagRerankPromptEditorOpen] = useState(false);
  const [tagRerankPlaygroundPromptOverride, setTagRerankPlaygroundPromptOverride] = useState<
    string | null
  >(null);
  const [isTagRerankPlaygroundPromptModalOpen, setIsTagRerankPlaygroundPromptModalOpen] =
    useState(false);
  const [isTagExclusionsModalOpen, setIsTagExclusionsModalOpen] = useState(false);
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);
  const [isPlaygroundResultModalOpen, setIsPlaygroundResultModalOpen] = useState(false);
  const [hasInjectedProcessingPrompt, setHasInjectedProcessingPrompt] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const playgroundResultOutputText = useMemo(
    () => formatAiPlaygroundOutput(playground.result?.outputText ?? ""),
    [playground.result?.outputText],
  );

  const copyBlock = useCallback((blockId: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedBlockId(blockId);
      setTimeout(() => setCopiedBlockId((current) => (current === blockId ? null : current)), 2000);
    });
  }, []);

  const combinedEstimatedCostUsd = useMemo(() => {
    const first = playground.result?.estimatedCostUsd ?? null;
    const rerank = tagRerankPlayground.result?.estimatedCostUsd ?? null;

    if (first == null && rerank == null) {
      return null;
    }

    return (first ?? 0) + (rerank ?? 0);
  }, [playground.result?.estimatedCostUsd, tagRerankPlayground.result?.estimatedCostUsd]);

  const selectedVisionModelId = draftVisionModelId ?? visionModelId;
  const selectedPromptTemplate = draftPromptTemplate ?? promptTemplate;
  const selectedTagRerankPromptTemplate = draftTagRerankPromptTemplate ?? tagRerankPromptTemplate;
  const selectedAdditionalTagExclusions = draftAdditionalTagExclusions ?? additionalTagExclusions;
  const additionalTagExclusionsInput = formatAdditionalTagExclusionsInput(selectedAdditionalTagExclusions);
  const selectedTagRerankMode = resolveClientTagRerankMode(draftTagRerankMode ?? tagRerankMode);
  const selectedSuggestionAuthorMode = resolveClientSuggestionAuthorMode(
    draftSuggestionAuthorMode ?? suggestionAuthorMode,
  );
  const selectedSuggestedNewTagsPolicy = resolveClientSuggestedNewTagsPolicy(
    draftSuggestedNewTagsPolicy ?? suggestedNewTagsPolicy,
  );
  const hasUnsavedChanges =
    (draftVisionModelId !== null && draftVisionModelId !== visionModelId) ||
    (draftPromptTemplate !== null &&
      resolveClientPromptTemplate(draftPromptTemplate) !== promptTemplate) ||
    (draftTagRerankPromptTemplate !== null &&
      resolveClientTagRerankPromptTemplate(draftTagRerankPromptTemplate) !==
        tagRerankPromptTemplate) ||
    (draftAdditionalTagExclusions !== null &&
      formatAdditionalTagExclusionsInput(draftAdditionalTagExclusions) !==
        formatAdditionalTagExclusionsInput(additionalTagExclusions)) ||
    (draftTagRerankMode !== null && draftTagRerankMode !== tagRerankMode) ||
    (draftSuggestionAuthorMode !== null && draftSuggestionAuthorMode !== suggestionAuthorMode) ||
    (draftSuggestedNewTagsPolicy !== null &&
      draftSuggestedNewTagsPolicy !== suggestedNewTagsPolicy);
  const promptTemplateError = !hasRequiredAiEnrichmentPromptPlaceholders(selectedPromptTemplate)
    ? "Prompt must include {{excluded_tags}} and {{approved_category_names}} so server-side values are inserted."
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
    resetTagRerankPlayground();
    setTagRerankPlaygroundPromptOverride(null);
    setIsTagRerankPlaygroundPromptModalOpen(false);
    setIsPlaygroundModalOpen(false);
  }, [resetPlayground, resetTagRerankPlayground]);

  const closePlaygroundResultModal = useCallback(() => {
    setIsPlaygroundResultModalOpen(false);
  }, []);

  const handleClosePromptTemplateEditor = useCallback(() => {
    setIsPromptTemplateEditorOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("settings-prompt-editor-open-button")?.focus();
    });
  }, []);

  const handleCloseTagRerankPromptEditor = useCallback(() => {
    setIsTagRerankPromptEditorOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("settings-tag-rerank-prompt-editor-open-button")?.focus();
    });
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
    if (!isPromptTemplateEditorOpen && !isTagRerankPromptEditorOpen && !isTagExclusionsModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (isPromptTemplateEditorOpen) {
        handleClosePromptTemplateEditor();
        return;
      }

      if (isTagRerankPromptEditorOpen) {
        handleCloseTagRerankPromptEditor();
        return;
      }

      setIsTagExclusionsModalOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleClosePromptTemplateEditor,
    handleCloseTagRerankPromptEditor,
    isPromptTemplateEditorOpen,
    isTagRerankPromptEditorOpen,
    isTagExclusionsModalOpen,
  ]);

  useEffect(() => {
    if (playground.result) {
      setIsPlaygroundResultModalOpen(true);
      resetTagRerankPlayground();
    }
  }, [playground.result, resetTagRerankPlayground]);

  useEffect(() => {
    if (isPlaygroundModalOpen) {
      setHasInjectedProcessingPrompt(false);
    }
  }, [isPlaygroundModalOpen]);

  useEffect(() => {
    if (!isPromptMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!playgroundPromptMenuRef.current?.contains(event.target as Node)) {
        setIsPromptMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isPromptMenuOpen]);

  function focusPlaygroundTextarea() {
    requestAnimationFrame(() => {
      playgroundTextareaRef.current?.focus({ preventScroll: true });
      playgroundTextareaRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleUseProcessingPrompt() {
    playground.setPrompt(selectedPromptTemplate);
    setHasInjectedProcessingPrompt(true);
    setIsPromptMenuOpen(false);
    focusPlaygroundTextarea();
  }

  function insertPromptPlaceholder(label: string, placeholder: string) {
    setIsPromptMenuOpen(false);

    if (playground.prompt.includes(placeholder)) {
      return;
    }

    const separator = playground.prompt.trim() ? "\n\n" : "";
    playground.setPrompt(`${playground.prompt}${separator}${label}:\n${placeholder}`);

    focusPlaygroundTextarea();
  }

  function handleInsertApprovedCategoriesPlaceholder() {
    insertPromptPlaceholder("Approved categories", AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER);
  }

  function handleInsertApprovedCategoryNamesPlaceholder() {
    insertPromptPlaceholder("Approved category names", AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER);
  }

  function handleInsertApprovedTagsPlaceholder() {
    insertPromptPlaceholder("Approved tags", AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER);
  }

  function handleInsertApprovedTagNamesPlaceholder() {
    insertPromptPlaceholder("Approved tag names", AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER);
  }

  async function handleSaveSettings() {
    await saveSettings({
      visionModelId: resolveClientVisionModelId(selectedVisionModelId),
      promptTemplate: selectedPromptTemplate,
      tagRerankPromptTemplate: selectedTagRerankPromptTemplate,
      additionalTagExclusions: parseAdditionalTagExclusionsInput(additionalTagExclusionsInput),
      tagRerankMode: selectedTagRerankMode,
      suggestionAuthorMode: selectedSuggestionAuthorMode,
      suggestedNewTagsPolicy: selectedSuggestedNewTagsPolicy,
    });
    setDraftVisionModelId(null);
    setDraftPromptTemplate(null);
    setDraftTagRerankPromptTemplate(null);
    setDraftAdditionalTagExclusions(null);
    setDraftTagRerankMode(null);
    setDraftSuggestionAuthorMode(null);
    setDraftSuggestedNewTagsPolicy(null);
    setIsPromptTemplateEditorOpen(false);
    setIsTagRerankPromptEditorOpen(false);
  }

  function handleOpenPromptTemplateEditor() {
    setIsPromptTemplateEditorOpen(true);
  }

  function handleUseCurrentDefaultPrompt() {
    setDraftPromptTemplate(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  }

  function handleOpenTagRerankPromptEditor() {
    setIsTagRerankPromptEditorOpen(true);
  }

  function handleUseCurrentDefaultTagRerankPrompt() {
    setDraftTagRerankPromptTemplate(DEFAULT_TAG_RERANK_PROMPT_TEMPLATE);
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

      <div
        aria-label="Settings sections"
        className="settings-page-tab-bar"
        role="tablist"
      >
        {settingsTabs.map((tab) => (
          <button
            aria-controls={`settings-tab-panel-${tab.id}`}
            aria-selected={resolvedTab === tab.id}
            className={`settings-page-tab${resolvedTab === tab.id ? " is-active" : ""}`}
            id={`settings-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {resolvedTab === "emailProviders" && canManageEmailProviders ? (
        <div
          aria-labelledby="settings-tab-emailProviders"
          className="settings-page-tab-panel"
          id="settings-tab-panel-emailProviders"
          role="tabpanel"
        >
          <EmailProviderSettingsSection />
        </div>
      ) : null}

      {resolvedTab === "uploadQuotas" && canManageCustomerUploadQuotas ? (
        <div
          aria-labelledby="settings-tab-uploadQuotas"
          className="settings-page-tab-panel"
          id="settings-tab-panel-uploadQuotas"
          role="tabpanel"
        >
          <CustomerUploadQuotaSettingsSection />
        </div>
      ) : null}

      {resolvedTab === "printRequestLimits" && canManageCustomerUploadQuotas ? (
        <div
          aria-labelledby="settings-tab-printRequestLimits"
          className="settings-page-tab-panel"
          id="settings-tab-panel-printRequestLimits"
          role="tabpanel"
        >
          <PrintRequestLimitSettingsSection />
        </div>
      ) : null}

      {resolvedTab === "socialSharing" && isOwner ? (
        <div
          aria-labelledby="settings-tab-socialSharing"
          className="settings-page-tab-panel"
          id="settings-tab-panel-socialSharing"
          role="tabpanel"
        >
          <PortalSocialMetaSettingsSection />
        </div>
      ) : null}

      {resolvedTab === "brandLogos" && isOwner ? (
        <div
          aria-labelledby="settings-tab-brandLogos"
          className="settings-page-tab-panel"
          id="settings-tab-panel-brandLogos"
          role="tabpanel"
        >
          <BrandLogoSettingsSection />
        </div>
      ) : null}

      {resolvedTab === "aiEnrichment" ? (
        <div
          aria-labelledby="settings-tab-aiEnrichment"
          className="settings-page-tab-panel"
          id="settings-tab-panel-aiEnrichment"
          role="tabpanel"
        >
          <section aria-labelledby="ai-enrichment-settings-title" className="card settings-section">
            <header className="settings-section-header">
              <h2 className="settings-section-title" id="ai-enrichment-settings-title">
                AI Enrichment
              </h2>
              <p className="settings-section-description">
                Choose the Google AI vision model and team tag exclusions used for catalog title,
                description, category, tags, and OCR. Applies on the next AI processing run.
              </p>
            </header>

            {isLoading ? (
              <p className="settings-section-status">Loading AI enrichment settings…</p>
            ) : (
              <div className="settings-form-grid">
                <div className="settings-control-grid">
                  <div className="settings-control-item">
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
                  </div>

                  <div className="settings-control-item">
                    <Select
                      disabled={!canManageSettings || isSaving}
                      label="Tag reranker"
                      name="tagRerankMode"
                      onChange={(event) => setDraftTagRerankMode(event.target.value)}
                      options={TAG_RERANK_MODE_OPTIONS.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      value={selectedTagRerankMode}
                    />

                    <p className="settings-field-hint">
                      {TAG_RERANK_MODE_OPTIONS.find((option) => option.value === selectedTagRerankMode)
                        ?.hint ?? selectedTagRerankMode}
                    </p>
                  </div>

                  <div className="settings-control-item">
                    <Select
                      disabled={!canManageSettings || isSaving}
                      label="Suggested new tags"
                      name="suggestedNewTagsPolicy"
                      onChange={(event) => setDraftSuggestedNewTagsPolicy(event.target.value)}
                      options={SUGGESTED_NEW_TAGS_POLICY_OPTIONS.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      value={selectedSuggestedNewTagsPolicy}
                    />

                    <p className="settings-field-hint">
                      {SUGGESTED_NEW_TAGS_POLICY_OPTIONS.find(
                        (option) => option.value === selectedSuggestedNewTagsPolicy,
                      )?.hint ?? selectedSuggestedNewTagsPolicy}
                    </p>
                  </div>

                  <div className="settings-control-item">
                    <Select
                      disabled={!canManageSettings || isSaving}
                      label="Suggested-tag writing"
                      name="suggestionAuthorMode"
                      onChange={(event) => setDraftSuggestionAuthorMode(event.target.value)}
                      options={SUGGESTION_AUTHOR_MODE_OPTIONS.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      value={selectedSuggestionAuthorMode}
                    />

                    <p className="settings-field-hint">
                      {SUGGESTION_AUTHOR_MODE_OPTIONS.find(
                        (option) => option.value === selectedSuggestionAuthorMode,
                      )?.hint ?? selectedSuggestionAuthorMode}
                    </p>
                  </div>
                </div>

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

                      <Button
                        disabled={!canManageSettings || isSaving}
                        id="settings-prompt-editor-open-button"
                        onClick={handleOpenPromptTemplateEditor}
                        variant="warning"
                      >
                        Edit prompt
                      </Button>
                    </div>

                    {promptTemplateError ? (
                      <p className="auth-message auth-message-error" role="alert">
                        {promptTemplateError}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isOwner ? (
                  <div className="settings-prompt-template-block settings-prompt-template-danger">
                    <div className="settings-prompt-template-summary">
                      <div className="settings-prompt-template-copy">
                        <h3 className="settings-subsection-title">Tag rerank prompt</h3>
                        <p className="settings-field-hint">
                          Instructional rules for the optional second-call tag reranker. Only used when
                          the tag reranker runs (see &quot;Tag reranker&quot; mode above).
                        </p>
                      </div>

                      <Button
                        disabled={!canManageSettings || isSaving}
                        id="settings-tag-rerank-prompt-editor-open-button"
                        onClick={handleOpenTagRerankPromptEditor}
                        variant="warning"
                      >
                        Edit prompt
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="settings-tag-exclusions-block">
                  <div className="settings-tag-exclusions-copy">
                    <h3 className="settings-subsection-title">Tag exclusions</h3>
                    <p className="settings-field-hint">
                      Built-in: {BASE_AI_TAG_EXCLUSIONS.length} | Additional:{" "}
                      {selectedAdditionalTagExclusions.length}
                    </p>
                  </div>

                  <Button
                    disabled={!canManageSettings || isSaving}
                    onClick={() => setIsTagExclusionsModalOpen(true)}
                    variant="secondary"
                  >
                    Manage exclusions
                  </Button>
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
        </div>
      ) : null}

      {isOwner && isPromptTemplateEditorOpen ? (
        <div className="modal-overlay modal-overlay-blur" onClick={handleClosePromptTemplateEditor}>
          <div
            className="settings-editor-modal-shell"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <Modal
              aria-labelledby="settings-prompt-editor-title"
              className="settings-editor-modal settings-prompt-editor-modal"
              role="dialog"
            >
              <ModalHeader className="settings-editor-modal-header">
                <div className="settings-editor-modal-title-group">
                  <h2 className="settings-section-title" id="settings-prompt-editor-title">
                    AI Processing prompt
                  </h2>
                  <p className="settings-section-description">
                    Editing this prompt changes live catalog suggestions generated for future designs.
                    Saving still happens from the main Settings page.
                  </p>
                </div>

                <Button
                  aria-label="Close prompt editor"
                  onClick={handleClosePromptTemplateEditor}
                  variant="ghost"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2} />
                </Button>
              </ModalHeader>

              <ModalBody className="settings-editor-modal-body">
                <div className="settings-form-actions">
                  <Button
                    disabled={!canManageSettings || isSaving}
                    onClick={handleUseCurrentDefaultPrompt}
                    variant="secondary"
                  >
                    Use current default
                  </Button>
                </div>

                <AutoResizeTextarea
                  disabled={!canManageSettings || isSaving}
                  label="AI Processing prompt"
                  maxAutoHeightPx={420}
                  maxLength={AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH}
                  name="promptTemplate"
                  onChange={(event) => setDraftPromptTemplate(event.target.value)}
                  value={selectedPromptTemplate}
                />

                <p className="settings-field-hint">
                  This prompt is used by AI Processing only. The AI Playground remains a one-off test
                  tool.
                </p>

                {promptTemplateError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {promptTemplateError}
                  </p>
                ) : null}
              </ModalBody>

              <ModalFooter>
                <Button onClick={handleClosePromptTemplateEditor} variant="secondary">
                  Close (Save on Settings page)
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        </div>
      ) : null}

      {isOwner && isTagRerankPromptEditorOpen ? (
        <div className="modal-overlay modal-overlay-blur" onClick={handleCloseTagRerankPromptEditor}>
          <div
            className="settings-editor-modal-shell"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <Modal
              aria-labelledby="settings-tag-rerank-prompt-editor-title"
              className="settings-editor-modal settings-prompt-editor-modal"
              role="dialog"
            >
              <ModalHeader className="settings-editor-modal-header">
                <div className="settings-editor-modal-title-group">
                  <h2 className="settings-section-title" id="settings-tag-rerank-prompt-editor-title">
                    Tag rerank prompt
                  </h2>
                  <p className="settings-section-description">
                    Editing this prompt changes the optional second-call tag reranker used for future
                    designs. Saving still happens from the main Settings page.
                  </p>
                </div>

                <Button
                  aria-label="Close tag rerank prompt editor"
                  onClick={handleCloseTagRerankPromptEditor}
                  variant="ghost"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2} />
                </Button>
              </ModalHeader>

              <ModalBody className="settings-editor-modal-body">
                <div className="settings-form-actions">
                  <Button
                    disabled={!canManageSettings || isSaving}
                    onClick={handleUseCurrentDefaultTagRerankPrompt}
                    variant="secondary"
                  >
                    Use current default
                  </Button>
                </div>

                <AutoResizeTextarea
                  disabled={!canManageSettings || isSaving}
                  label="Tag rerank prompt"
                  maxAutoHeightPx={420}
                  maxLength={AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH}
                  name="tagRerankPromptTemplate"
                  onChange={(event) => setDraftTagRerankPromptTemplate(event.target.value)}
                  value={selectedTagRerankPromptTemplate}
                />

                <p className="settings-field-hint">
                  This prompt is used by the tag reranker in AI Processing only. The AI Playground
                  tag rerank test has its own one-off override below and does not save here.
                </p>
              </ModalBody>

              <ModalFooter>
                <Button onClick={handleCloseTagRerankPromptEditor} variant="secondary">
                  Close (Save on Settings page)
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        </div>
      ) : null}

      {canManageSettings && isTagExclusionsModalOpen ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={() => setIsTagExclusionsModalOpen(false)}
        >
          <div
            className="settings-editor-modal-shell"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <Modal
              aria-labelledby="settings-tag-exclusions-title"
              className="settings-editor-modal settings-tag-exclusions-modal"
              role="dialog"
            >
              <ModalHeader className="settings-editor-modal-header">
                <div className="settings-editor-modal-title-group">
                  <h2 className="settings-section-title" id="settings-tag-exclusions-title">
                    Tag exclusions
                  </h2>
                  <p className="settings-section-description">
                    Built-in exclusions always apply. Add team-specific single-word tags to block from
                    AI suggestions.
                  </p>
                </div>

                <Button
                  aria-label="Close tag exclusions"
                  onClick={() => setIsTagExclusionsModalOpen(false)}
                  variant="ghost"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2} />
                </Button>
              </ModalHeader>

              <ModalBody className="settings-editor-modal-body">
                <section className="settings-modal-section" aria-labelledby="built-in-exclusions-title">
                  <div className="settings-modal-section-header">
                    <h3 className="settings-subsection-title" id="built-in-exclusions-title">
                      Built-in exclusions
                    </h3>
                    <p className="settings-field-hint">{BASE_AI_TAG_EXCLUSIONS.length} always active</p>
                  </div>

                  <div className="settings-tag-chip-row" aria-label="Built-in tag exclusions">
                    {BASE_AI_TAG_EXCLUSIONS.map((tag: string) => (
                      <Badge key={tag} variant="default">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </section>

                <section className="settings-modal-section" aria-labelledby="additional-exclusions-title">
                  <div className="settings-modal-section-header">
                    <h3 className="settings-subsection-title" id="additional-exclusions-title">
                      Additional exclusions
                    </h3>
                    <p className="settings-field-hint">
                      {selectedAdditionalTagExclusions.length} team-specific exclusions
                    </p>
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
                </section>
              </ModalBody>

              <ModalFooter>
                <Button onClick={() => setIsTagExclusionsModalOpen(false)} variant="secondary">
                  Done
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        </div>
      ) : null}

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
                  </div>

                  <div className="settings-playground-composer">
                    <div className="settings-playground-prompt-field">
                      <div className="settings-playground-prompt-header">
                        <label htmlFor={playgroundPromptId}>Prompt</label>
                        <div className="settings-playground-prompt-menu-shell" ref={playgroundPromptMenuRef}>
                          <Button
                            aria-controls={playgroundPromptMenuId}
                            aria-expanded={isPromptMenuOpen}
                            aria-haspopup="menu"
                            disabled={playground.isRunning}
                            onClick={() => setIsPromptMenuOpen((current) => !current)}
                            size="sm"
                            variant="secondary"
                          >
                            <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                            <span>Insert prompt</span>
                            <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
                          </Button>

                          {isPromptMenuOpen ? (
                            <div
                              aria-label="Insert prompt options"
                              className="settings-playground-prompt-menu"
                              id={playgroundPromptMenuId}
                              role="menu"
                            >
                              <button
                                className="settings-playground-prompt-menu-option"
                                disabled={hasInjectedProcessingPrompt}
                                onClick={handleUseProcessingPrompt}
                                role="menuitem"
                                type="button"
                              >
                                <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                                <span>Use prompt</span>
                              </button>
                              <button
                                className="settings-playground-prompt-menu-option"
                                disabled={playground.prompt.includes(
                                  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
                                )}
                                onClick={handleInsertApprovedCategoriesPlaceholder}
                                role="menuitem"
                                type="button"
                              >
                                <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                                <span>Use categories</span>
                              </button>
                              <button
                                className="settings-playground-prompt-menu-option"
                                disabled={playground.prompt.includes(
                                  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
                                )}
                                onClick={handleInsertApprovedCategoryNamesPlaceholder}
                                role="menuitem"
                                type="button"
                              >
                                <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                                <span>Use category names</span>
                              </button>
                              <button
                                className="settings-playground-prompt-menu-option"
                                disabled={playground.prompt.includes(
                                  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
                                )}
                                onClick={handleInsertApprovedTagsPlaceholder}
                                role="menuitem"
                                type="button"
                              >
                                <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                                <span>Use tags</span>
                              </button>
                              <button
                                className="settings-playground-prompt-menu-option"
                                disabled={playground.prompt.includes(
                                  AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER,
                                )}
                                onClick={handleInsertApprovedTagNamesPlaceholder}
                                role="menuitem"
                                type="button"
                              >
                                <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
                                <span>Use tag names</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
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
                          Image optional — attach a PNG, JPEG, or WebP up to 50 MB to test vision
                          prompts, or leave it empty for a text-only prompt test. The file is
                          processed transiently on the server and is not stored.
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
                  </dl>

                  <div className="settings-playground-output">
                    <div className="settings-playground-output-header">
                      <h3 className="settings-subsection-title">Response output</h3>
                      <button
                        aria-label="Copy response output"
                        className="icon-button icon-button-sm icon-button-ghost"
                        onClick={() => copyBlock("first-call", playgroundResultOutputText)}
                        type="button"
                      >
                        {copiedBlockId === "first-call"
                          ? <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                          : <Copy aria-hidden="true" size={15} strokeWidth={2.2} />}
                      </button>
                    </div>
                    <pre>{playgroundResultOutputText}</pre>
                  </div>

                  <div className="settings-playground-tag-rerank">
                    <div className="settings-form-actions">
                      <Button
                        disabled={
                          !canManageSettings ||
                          tagRerankPlayground.isRunning ||
                          !isValidFirstCallJson(playground.result.outputText)
                        }
                        onClick={() =>
                          void tagRerankPlayground.runTagRerank(
                            playground.result?.outputText ?? "",
                            playground.result?.visionModelId ?? playground.visionModelId,
                            tagRerankPlaygroundPromptOverride?.trim() || undefined,
                          )
                        }
                        variant="secondary"
                      >
                        {tagRerankPlayground.isRunning ? "Running tag rerank…" : "Run tag rerank"}
                      </Button>

                      <button
                        aria-label="Edit tag rerank prompt override for this playground run"
                        className="icon-button icon-button-sm icon-button-ghost"
                        disabled={tagRerankPlayground.isRunning}
                        onClick={() => {
                          setTagRerankPlaygroundPromptOverride(
                            (current) => current ?? tagRerankPromptTemplate,
                          );
                          setIsTagRerankPlaygroundPromptModalOpen(true);
                        }}
                        title="Tag rerank prompt override (optional, one-off — does not save)"
                        type="button"
                      >
                        <Settings aria-hidden="true" size={16} strokeWidth={2} />
                      </button>

                      {tagRerankPlaygroundPromptOverride?.trim() ? (
                        <p className="settings-field-hint">Prompt override active for this run.</p>
                      ) : null}
                      {combinedEstimatedCostUsd != null ? (
                        <p className="settings-field-hint settings-playground-combined-cost">
                          Combined cost (both runs): ${combinedEstimatedCostUsd.toFixed(6)}
                        </p>
                      ) : null}
                      {!isValidFirstCallJson(playground.result.outputText) ? (
                        <p className="settings-field-hint">
                          The response above must be valid JSON with title, description, category,
                          and tags before the tag rerank can run.
                        </p>
                      ) : null}
                    </div>

                    {tagRerankPlayground.error ? (
                      <p className="auth-message auth-message-error" role="alert">
                        {tagRerankPlayground.error}
                      </p>
                    ) : null}

                    {tagRerankPlayground.result ? (
                      <section
                        aria-label="AI tag rerank result"
                        className="settings-playground-result settings-playground-tag-rerank-result"
                      >
                        <h3 className="settings-subsection-title">Tag rerank result</h3>
                        <dl className="settings-playground-result-meta">
                          <div>
                            <dt>Elapsed</dt>
                            <dd>{tagRerankPlayground.result.elapsedMs} ms</dd>
                          </div>
                          <div>
                            <dt>Input tokens</dt>
                            <dd>{tagRerankPlayground.result.promptTokens ?? "N/A"}</dd>
                          </div>
                          <div>
                            <dt>Output tokens</dt>
                            <dd>{tagRerankPlayground.result.completionTokens ?? "N/A"}</dd>
                          </div>
                          <div>
                            <dt>Estimated cost</dt>
                            <dd>
                              {tagRerankPlayground.result.estimatedCostUsd != null
                                ? `$${tagRerankPlayground.result.estimatedCostUsd.toFixed(6)}`
                                : "N/A"}
                            </dd>
                          </div>
                        </dl>

                        <div className="settings-playground-output settings-playground-output-compact">
                          <div className="settings-playground-output-header">
                            <h4 className="settings-subsection-title">
                              Approved tag candidates sent ({tagRerankPlayground.result.approvedTagCandidates.length})
                            </h4>
                            <button
                              aria-label="Copy approved tag candidates"
                              className="icon-button icon-button-sm icon-button-ghost"
                              onClick={() =>
                                copyBlock(
                                  "candidates",
                                  JSON.stringify(tagRerankPlayground.result?.approvedTagCandidates, null, 2),
                                )
                              }
                              type="button"
                            >
                              {copiedBlockId === "candidates"
                                ? <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                                : <Copy aria-hidden="true" size={15} strokeWidth={2.2} />}
                            </button>
                          </div>
                          <pre>
                            {JSON.stringify(tagRerankPlayground.result.approvedTagCandidates, null, 2)}
                          </pre>
                        </div>

                        <div className="settings-playground-output">
                          <div className="settings-playground-output-header">
                            <h4 className="settings-subsection-title">Reranker output</h4>
                            <button
                              aria-label="Copy reranker output"
                              className="icon-button icon-button-sm icon-button-ghost"
                              onClick={() =>
                                copyBlock(
                                  "reranker",
                                  formatAiPlaygroundOutput(tagRerankPlayground.result?.outputText ?? ""),
                                )
                              }
                              type="button"
                            >
                              {copiedBlockId === "reranker"
                                ? <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                                : <Copy aria-hidden="true" size={15} strokeWidth={2.2} />}
                            </button>
                          </div>
                          <pre>{formatAiPlaygroundOutput(tagRerankPlayground.result.outputText)}</pre>
                        </div>

                        {tagRerankPlayground.result.discardedTags.length > 0 ? (
                          <p className="settings-field-hint">
                            Discarded tags not in the approved shortlist:{" "}
                            {tagRerankPlayground.result.discardedTags.join(", ")}
                          </p>
                        ) : null}
                      </section>
                    ) : null}
                  </div>
                </section>
              </ModalBody>
            </Modal>
          </div>
        </div>
      ) : null}

      {canManageSettings && isTagRerankPlaygroundPromptModalOpen ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={() => setIsTagRerankPlaygroundPromptModalOpen(false)}
        >
          <div
            className="settings-editor-modal-shell"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <Modal
              aria-labelledby="tag-rerank-playground-prompt-modal-title"
              className="settings-editor-modal settings-prompt-editor-modal"
              role="dialog"
            >
              <ModalHeader className="settings-editor-modal-header">
                <div className="settings-editor-modal-title-group">
                  <h2 className="settings-section-title" id="tag-rerank-playground-prompt-modal-title">
                    Tag rerank prompt override
                  </h2>
                  <p className="settings-section-description">
                    One-off override for this Playground run only. Does not save to Settings.
                  </p>
                </div>

                <Button
                  aria-label="Close tag rerank prompt override editor"
                  onClick={() => setIsTagRerankPlaygroundPromptModalOpen(false)}
                  variant="ghost"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2} />
                </Button>
              </ModalHeader>

              <ModalBody className="settings-editor-modal-body">
                <div className="settings-form-actions">
                  <Button
                    disabled={tagRerankPlayground.isRunning}
                    onClick={() => setTagRerankPlaygroundPromptOverride(tagRerankPromptTemplate)}
                    variant="secondary"
                  >
                    Reset to live prompt
                  </Button>
                </div>

                <AutoResizeTextarea
                  disabled={tagRerankPlayground.isRunning}
                  label="Tag rerank prompt override"
                  maxAutoHeightPx={420}
                  maxLength={AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH}
                  name="tagRerankPlaygroundPromptOverride"
                  onChange={(event) => setTagRerankPlaygroundPromptOverride(event.target.value)}
                  value={tagRerankPlaygroundPromptOverride ?? tagRerankPromptTemplate}
                />

                <p className="settings-field-hint">
                  Pre-filled with the live tag rerank prompt from Settings. Edit freely — changes
                  here only affect this playground run and are not saved.
                </p>
              </ModalBody>

              <ModalFooter>
                <Button
                  onClick={() => setIsTagRerankPlaygroundPromptModalOpen(false)}
                  variant="secondary"
                >
                  Done
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        </div>
      ) : null}
    </main>
  );
}
