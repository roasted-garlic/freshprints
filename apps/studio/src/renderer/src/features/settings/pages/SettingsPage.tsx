import { Check, ChevronDown, Copy, Paperclip, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH } from "@fresh-prints/shared/constants/aiEnrichment.constants";
import { Button } from "../../../shared/components/Button";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { EmailProviderSettingsSection } from "../components/EmailProviderSettingsSection";
import { CustomerUploadQuotaSettingsSection } from "../components/CustomerUploadQuotaSettingsSection";
import { PortalSocialMetaSettingsSection } from "../components/PortalSocialMetaSettingsSection";
import { PortalHelpSettingsSection } from "../components/PortalHelpSettingsSection";
import { BrandLogoSettingsSection } from "../components/BrandLogoSettingsSection";
import { PrintRequestLimitSettingsSection } from "../components/PrintRequestLimitSettingsSection";
import { StandardPrintSizesSettingsSection } from "../components/StandardPrintSizesSettingsSection";
import { StudioUpdatesSettingsSection } from "../components/StudioUpdatesSettingsSection";
import { CatalogProcessingModeSettingsSection } from "../components/CatalogProcessingModeSettingsSection";
import { CatalogReprocessingSettingsSection } from "../components/CatalogReprocessingSettingsSection";
import { AutomationHealthSettingsSection } from "../components/AutomationHealthSettingsSection";
import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  ALL_VISION_MODEL_OPTIONS,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  hasRequiredAiEnrichmentPromptPlaceholders,
  resolveClientPromptTemplate,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import { useAiEnrichmentPlayground } from "../hooks/useAiEnrichmentPlayground";
import { useAiEnrichmentSemanticReviewPlayground } from "../hooks/useAiEnrichmentSemanticReviewPlayground";
import {
  formatExplicitContentAutomationTermsInput,
  parseExplicitContentAutomationTermsInput,
  useAiEnrichmentSettings,
} from "../hooks/useAiEnrichmentSettings";
import { ExplicitContentAutomationSettingsSection } from "../components/ExplicitContentAutomationSettingsSection";
import { formatAiPlaygroundOutput } from "../utils/aiPlaygroundOutputFormatter";
import { formatCombinedAiCost } from "../utils/aiPlaygroundPass2Flow";
import { HelperSettingsPage } from "./HelperSettingsPage";
import { AiEnrichmentTraceBrowser } from "../components/AiEnrichmentTraceBrowser";

function formatPlaygroundJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "N/A";
}

function formatPlaygroundCost(value: number | null | undefined): string {
  return value == null ? "N/A" : `$${value.toFixed(6)}`;
}

type SettingsPageTabId =
  | "emailProviders"
  | "uploadQuotas"
  | "printRequestLimits"
  | "standardPrintSizes"
  | "socialSharing"
  | "faqHowTo"
  | "brandLogos"
  | "aiEnrichment"
  | "studioUpdates";

type AiEnrichmentSubTabId =
  "general" | "inspector" | "explicitContent" | "catalogReprocessing";

type AiPlaygroundResultTabId =
  "overview" | "profiles" | "response" | "semanticReview";

const AI_PLAYGROUND_RESULT_TABS: ReadonlyArray<{
  id: AiPlaygroundResultTabId;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "profiles", label: "Profiles" },
  { id: "response", label: "Response" },
  { id: "semanticReview", label: "Semantic Review" },
];

const AI_ENRICHMENT_SUB_TABS: ReadonlyArray<{
  id: AiEnrichmentSubTabId;
  label: string;
}> = [
  { id: "general", label: "General" },
  { id: "explicitContent", label: "Explicit Content" },
  { id: "catalogReprocessing", label: "Catalog Reprocessing" },
  { id: "inspector", label: "Inspector" },
];

interface SettingsPageTab {
  id: SettingsPageTabId;
  label: string;
}

export function SettingsPage() {
  const { user } = useAuth();

  if (permissionService.isHelper(user)) {
    return <HelperSettingsPage />;
  }

  if (!permissionService.canManageSettings(user)) {
    return <HelperSettingsPage />;
  }

  return <ManageableSettingsPage />;
}

function ManageableSettingsPage() {
  const { user } = useAuth();

  if (permissionService.isHelper(user)) {
    return <HelperSettingsPage />;
  }

  const isOwner = permissionService.isOwner(user);
  const canManageSettings = permissionService.canManageSettings(user);
  const canViewAdministrativeSettings =
    permissionService.canViewAdministrativeSettings(user);
  const canManageEmailProviders =
    permissionService.canManageEmailProviders(user);
  const canManageCustomerUploadQuotas =
    permissionService.canManageCustomerUploadQuotas(user);
  const canManageStandardPrintSizes =
    permissionService.canManageStandardPrintSizes(user);
  const settingsTabs = useMemo((): SettingsPageTab[] => {
    const tabs: SettingsPageTab[] = [];

    if (canManageEmailProviders) {
      tabs.push({ id: "emailProviders", label: "Email Providers" });
    }

    if (canManageCustomerUploadQuotas) {
      tabs.push({ id: "uploadQuotas", label: "Upload quotas" });
      tabs.push({ id: "printRequestLimits", label: "Print request limits" });
    }

    if (canManageStandardPrintSizes) {
      tabs.push({ id: "standardPrintSizes", label: "Standard Print Sizes" });
    }

    if (isOwner) {
      tabs.push({ id: "socialSharing", label: "Social sharing" });
      tabs.push({ id: "brandLogos", label: "Brand logos" });
    }

    if (canViewAdministrativeSettings) {
      tabs.push({ id: "faqHowTo", label: "FAQ and How To" });
      tabs.push({ id: "aiEnrichment", label: "AI Enrichment" });
    }

    tabs.push({ id: "studioUpdates", label: "Studio updates" });
    return tabs;
  }, [
    canManageCustomerUploadQuotas,
    canManageEmailProviders,
    canManageStandardPrintSizes,
    canViewAdministrativeSettings,
    isOwner,
  ]);
  const [activeTab, setActiveTab] = useState<SettingsPageTabId | null>(null);
  const resolvedTab: SettingsPageTabId =
    activeTab && settingsTabs.some((tab) => tab.id === activeTab)
      ? activeTab
      : (settingsTabs[0]?.id ?? "studioUpdates");
  const {
    additionalTagExclusions,
    explicitContentAutomationTerms,
    semanticReviewerModelId,
    error,
    isLoading,
    isSaving,
    promptTemplate,
    saveError,
    saveSettings,
    visionModelId,
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
  } = useAiEnrichmentSettings();
  const playground = useAiEnrichmentPlayground();
  const semanticReviewPlayground = useAiEnrichmentSemanticReviewPlayground({
    pass1Result: playground.result,
    semanticReviewerModelId,
  });
  const { resetPlayground } = playground;
  const playgroundImageInputId = useId();
  const playgroundPromptId = useId();
  const playgroundPromptMenuId = useId();
  const playgroundTextareaRef = useRef<HTMLTextAreaElement>(null);
  const playgroundPromptMenuRef = useRef<HTMLDivElement>(null);
  const [isPromptMenuOpen, setIsPromptMenuOpen] = useState(false);
  const [draftVisionModelId, setDraftVisionModelId] = useState<string | null>(
    null,
  );
  const [draftPromptTemplate, setDraftPromptTemplate] = useState<string | null>(
    null,
  );
  const [
    draftExplicitContentAutomationTerms,
    setDraftExplicitContentAutomationTerms,
  ] = useState<string[] | null>(null);
  const [isPromptTemplateEditorOpen, setIsPromptTemplateEditorOpen] =
    useState(false);
  const [isPlaygroundModalOpen, setIsPlaygroundModalOpen] = useState(false);
  const [isPlaygroundResultModalOpen, setIsPlaygroundResultModalOpen] =
    useState(false);
  const [playgroundResultTab, setPlaygroundResultTab] =
    useState<AiPlaygroundResultTabId>("overview");
  const [hasInjectedProcessingPrompt, setHasInjectedProcessingPrompt] =
    useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [aiEnrichmentSubTab, setAiEnrichmentSubTab] =
    useState<AiEnrichmentSubTabId>("general");
  const playgroundResultOutputText = useMemo(
    () => formatAiPlaygroundOutput(playground.result?.outputText ?? ""),
    [playground.result?.outputText],
  );
  const playgroundPass1Context = playground.result?.pass1Context;
  const semanticReviewResult = semanticReviewPlayground.result;
  const combinedPlaygroundCost = formatCombinedAiCost(
    playground.result?.estimatedCostUsd,
    semanticReviewResult?.estimatedCostUsd,
  );

  const copyBlock = useCallback((blockId: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedBlockId(blockId);
      setTimeout(
        () =>
          setCopiedBlockId((current) => (current === blockId ? null : current)),
        2000,
      );
    });
  }, []);

  const selectedVisionModelId = draftVisionModelId ?? visionModelId;
  const selectedPromptTemplate = draftPromptTemplate ?? promptTemplate;
  const selectedExplicitContentAutomationTerms =
    draftExplicitContentAutomationTerms ?? explicitContentAutomationTerms;
  const explicitContentAutomationTermsInput =
    formatExplicitContentAutomationTermsInput(
      selectedExplicitContentAutomationTerms,
    );
  const hasUnsavedChanges =
    (draftVisionModelId !== null && draftVisionModelId !== visionModelId) ||
    (draftPromptTemplate !== null &&
      resolveClientPromptTemplate(draftPromptTemplate) !== promptTemplate) ||
    (draftExplicitContentAutomationTerms !== null &&
      formatExplicitContentAutomationTermsInput(
        draftExplicitContentAutomationTerms,
      ) !==
        formatExplicitContentAutomationTermsInput(
          explicitContentAutomationTerms,
        )) ||
    false;
  const promptTemplateError = !hasRequiredAiEnrichmentPromptPlaceholders(
    selectedPromptTemplate,
  )
    ? "Prompt must include {{approved_categories}} so active category descriptions are inserted."
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

  const handleClosePromptTemplateEditor = useCallback(() => {
    setIsPromptTemplateEditorOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("settings-prompt-editor-open-button")?.focus();
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
    if (!isPromptTemplateEditorOpen) {
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClosePromptTemplateEditor, isPromptTemplateEditorOpen]);

  useEffect(() => {
    if (playground.result) {
      setPlaygroundResultTab("overview");
      setIsPlaygroundResultModalOpen(true);
    }
  }, [playground.result]);

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
    playground.setPrompt(
      `${playground.prompt}${separator}${label}:\n${placeholder}`,
    );

    focusPlaygroundTextarea();
  }

  function handleInsertApprovedCategoriesPlaceholder() {
    insertPromptPlaceholder(
      "Approved categories",
      AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
    );
  }

  async function handleSaveSettings() {
    await saveSettings({
      visionModelId: resolveClientVisionModelId(selectedVisionModelId),
      promptTemplate: selectedPromptTemplate,
      // Historical tag exclusions are read/preserved for the compatibility callable only; no UI
      // control or active Pass 1 prompt path consumes them.
      additionalTagExclusions,
      explicitContentAutomationTerms: parseExplicitContentAutomationTermsInput(
        explicitContentAutomationTermsInput,
      ),
    });
    setDraftVisionModelId(null);
    setDraftPromptTemplate(null);
    setDraftExplicitContentAutomationTerms(null);
    setIsPromptTemplateEditorOpen(false);
  }

  function handleOpenPromptTemplateEditor() {
    setIsPromptTemplateEditorOpen(true);
  }

  function handleUseCurrentDefaultPrompt() {
    setDraftPromptTemplate(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
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

      {resolvedTab === "standardPrintSizes" && canManageStandardPrintSizes ? (
        <div
          aria-labelledby="settings-tab-standardPrintSizes"
          className="settings-page-tab-panel"
          id="settings-tab-panel-standardPrintSizes"
          role="tabpanel"
        >
          <StandardPrintSizesSettingsSection />
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

      {resolvedTab === "faqHowTo" && canViewAdministrativeSettings ? (
        <div
          aria-labelledby="settings-tab-faqHowTo"
          className="settings-page-tab-panel"
          id="settings-tab-panel-faqHowTo"
          role="tabpanel"
        >
          <PortalHelpSettingsSection />
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

      {resolvedTab === "aiEnrichment" && canViewAdministrativeSettings ? (
        <div
          aria-labelledby="settings-tab-aiEnrichment"
          className="settings-page-tab-panel"
          id="settings-tab-panel-aiEnrichment"
          role="tabpanel"
        >
          <div
            aria-label="AI Enrichment sections"
            className="settings-page-subtab-bar"
            role="tablist"
          >
            {AI_ENRICHMENT_SUB_TABS.map((subTab) => (
              <button
                aria-controls={`ai-enrichment-subtab-panel-${subTab.id}`}
                aria-selected={aiEnrichmentSubTab === subTab.id}
                className={`settings-page-subtab${aiEnrichmentSubTab === subTab.id ? " is-active" : ""}`}
                id={`ai-enrichment-subtab-${subTab.id}`}
                key={subTab.id}
                onClick={() => setAiEnrichmentSubTab(subTab.id)}
                role="tab"
                type="button"
              >
                {subTab.label}
              </button>
            ))}
          </div>

          {aiEnrichmentSubTab === "general" ? (
            <div
              aria-labelledby="ai-enrichment-subtab-general"
              className="settings-page-subtab-panel"
              id="ai-enrichment-subtab-panel-general"
              role="tabpanel"
            >
              <section
                aria-labelledby="ai-enrichment-settings-title"
                className="card settings-section"
              >
                <header className="settings-section-header">
                  <h2
                    className="settings-section-title"
                    id="ai-enrichment-settings-title"
                  >
                    AI Enrichment
                  </h2>
                  <p className="settings-section-description">
                    Choose the Google AI vision model and visual catalog prompt
                    used on the next AI processing run.
                  </p>
                </header>

                {isLoading ? (
                  <p className="settings-section-status">
                    Loading AI enrichment settings…
                  </p>
                ) : (
                  <div className="settings-form-grid">
                    <div className="settings-control-grid">
                      <div className="settings-control-item">
                        <Select
                          disabled={!canManageSettings || isSaving}
                          label="Default AI model"
                          name="visionModelId"
                          onChange={(event) =>
                            setDraftVisionModelId(event.target.value)
                          }
                          options={ALL_VISION_MODEL_OPTIONS.map((option) => ({
                            label: option.label,
                            value: option.value,
                          }))}
                          value={selectedVisionModelId}
                        />

                        <p className="settings-field-hint">
                          {ALL_VISION_MODEL_OPTIONS.find(
                            (option) => option.value === selectedVisionModelId,
                          )?.hint ?? selectedVisionModelId}
                        </p>
                      </div>
                    </div>

                    {isOwner ? (
                      <div className="settings-prompt-template-block settings-prompt-template-danger">
                        <div className="settings-prompt-template-summary">
                          <div className="settings-prompt-template-copy">
                            <h3 className="settings-subsection-title">
                              AI Processing prompt
                            </h3>
                            <p className="settings-field-hint">
                              This prompt drives live AI Processing output. Keep
                              it collapsed unless you are intentionally changing
                              the production prompt.
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
                          <p
                            className="auth-message auth-message-error"
                            role="alert"
                          >
                            {promptTemplateError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {canManageSettings ? (
                      <div className="settings-card-footer">
                        <div className="settings-form-actions">
                          <Button
                            disabled={
                              !hasUnsavedChanges ||
                              isSaving ||
                              Boolean(promptTemplateError)
                            }
                            onClick={() => void handleSaveSettings()}
                            variant="primary"
                          >
                            {isSaving
                              ? "Saving…"
                              : "Save AI enrichment settings"}
                          </Button>
                        </div>

                        <div className="settings-card-aside">
                          <Button
                            onClick={() => setIsPlaygroundModalOpen(true)}
                            variant="secondary"
                          >
                            Open AI Playground
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="settings-section-status">
                        Only owners and admins can change AI enrichment
                        settings.
                      </p>
                    )}
                  </div>
                )}
              </section>

              <CatalogProcessingModeSettingsSection
                catalogAutonomousLiveEnabled={catalogAutonomousLiveEnabled}
                catalogWorkflowMode={catalogWorkflowMode}
                isLoading={isLoading}
              />
              <AutomationHealthSettingsSection
                catalogAutonomousLiveEnabled={catalogAutonomousLiveEnabled}
                catalogWorkflowMode={catalogWorkflowMode}
                isLoading={isLoading}
              />
            </div>
          ) : null}

          {aiEnrichmentSubTab === "inspector" ? (
            <div
              aria-labelledby="ai-enrichment-subtab-inspector"
              className="settings-page-subtab-panel"
              id="ai-enrichment-subtab-panel-inspector"
              role="tabpanel"
            >
              <AiEnrichmentTraceBrowser />
            </div>
          ) : null}

          {aiEnrichmentSubTab === "explicitContent" ? (
            <div
              aria-labelledby="ai-enrichment-subtab-explicitContent"
              className="settings-page-subtab-panel"
              id="ai-enrichment-subtab-panel-explicitContent"
              role="tabpanel"
            >
              <ExplicitContentAutomationSettingsSection
                canEdit={canManageSettings && !isLoading}
                onChange={(nextValue) =>
                  setDraftExplicitContentAutomationTerms(
                    parseExplicitContentAutomationTermsInput(nextValue),
                  )
                }
                termsInput={explicitContentAutomationTermsInput}
              />
              {canManageSettings ? (
                <div className="settings-form-actions">
                  <Button
                    disabled={
                      !hasUnsavedChanges ||
                      isSaving ||
                      Boolean(promptTemplateError)
                    }
                    onClick={() => void handleSaveSettings()}
                    variant="primary"
                  >
                    {isSaving ? "Saving…" : "Save AI enrichment settings"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {aiEnrichmentSubTab === "catalogReprocessing" ? (
            <div
              aria-labelledby="ai-enrichment-subtab-catalogReprocessing"
              className="settings-page-subtab-panel"
              id="ai-enrichment-subtab-panel-catalogReprocessing"
              role="tabpanel"
            >
              <CatalogReprocessingSettingsSection
                catalogAutonomousLiveEnabled={catalogAutonomousLiveEnabled}
                catalogWorkflowMode={catalogWorkflowMode}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {resolvedTab === "studioUpdates" ? (
        <div
          aria-labelledby="settings-tab-studioUpdates"
          className="settings-page-tab-panel"
          id="settings-tab-panel-studioUpdates"
          role="tabpanel"
        >
          <StudioUpdatesSettingsSection />
        </div>
      ) : null}

      {isOwner && isPromptTemplateEditorOpen ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={handleClosePromptTemplateEditor}
        >
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
                  <h2
                    className="settings-section-title"
                    id="settings-prompt-editor-title"
                  >
                    AI Processing prompt
                  </h2>
                  <p className="settings-section-description">
                    Editing this prompt changes live catalog suggestions
                    generated for future designs. Saving still happens from the
                    main Settings page.
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
                  onChange={(event) =>
                    setDraftPromptTemplate(event.target.value)
                  }
                  value={selectedPromptTemplate}
                />

                <p className="settings-field-hint">
                  This prompt is used by AI Processing only. The AI Playground
                  remains a one-off test tool.
                </p>

                {promptTemplateError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {promptTemplateError}
                  </p>
                ) : null}
              </ModalBody>

              <ModalFooter>
                <Button
                  onClick={handleClosePromptTemplateEditor}
                  variant="secondary"
                >
                  Close (Save on Settings page)
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
                  <h2
                    className="settings-section-title"
                    id="ai-playground-title"
                  >
                    AI Playground
                  </h2>
                  <p className="settings-section-description">
                    Test a one-off text + image prompt through Cloud Functions.
                    This does not change saved AI settings or write to designs.
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
                      onChange={(event) =>
                        playground.setVisionModelId(event.target.value)
                      }
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
                        <div
                          className="settings-playground-prompt-menu-shell"
                          ref={playgroundPromptMenuRef}
                        >
                          <Button
                            aria-controls={playgroundPromptMenuId}
                            aria-expanded={isPromptMenuOpen}
                            aria-haspopup="menu"
                            disabled={playground.isRunning}
                            onClick={() =>
                              setIsPromptMenuOpen((current) => !current)
                            }
                            size="sm"
                            variant="secondary"
                          >
                            <Sparkles
                              aria-hidden="true"
                              size={14}
                              strokeWidth={2.1}
                            />
                            <span>Insert prompt</span>
                            <ChevronDown
                              aria-hidden="true"
                              size={14}
                              strokeWidth={2.4}
                            />
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
                                <Sparkles
                                  aria-hidden="true"
                                  size={14}
                                  strokeWidth={2.1}
                                />
                                <span>Use prompt</span>
                              </button>
                              <button
                                className="settings-playground-prompt-menu-option"
                                disabled={playground.prompt.includes(
                                  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
                                )}
                                onClick={
                                  handleInsertApprovedCategoriesPlaceholder
                                }
                                role="menuitem"
                                type="button"
                              >
                                <Sparkles
                                  aria-hidden="true"
                                  size={14}
                                  strokeWidth={2.1}
                                />
                                <span>Use categories</span>
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
                        onChange={(event) =>
                          playground.setPrompt(event.target.value)
                        }
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
                          playground.setSelectedImage(
                            event.target.files?.[0] ?? null,
                          );
                          event.currentTarget.value = "";

                          requestAnimationFrame(() => {
                            playgroundTextareaRef.current?.focus({
                              preventScroll: true,
                            });
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
                        <Paperclip
                          aria-hidden="true"
                          size={18}
                          strokeWidth={2.2}
                        />
                      </label>
                    </div>

                    <div className="settings-playground-composer-footer">
                      <div className="settings-playground-upload-state">
                        <p className="settings-field-hint">
                          Image optional — attach a PNG, JPEG, or WebP up to 50
                          MB to test vision prompts, or leave it empty for a
                          text-only prompt test. The file is processed
                          transiently on the server and is not stored.
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
                          {playground.isRunning
                            ? "Running…"
                            : "Run AI playground"}
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
                  <h2
                    className="settings-section-title"
                    id="ai-playground-result-title"
                  >
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
                <div
                  aria-label="AI playground result sections"
                  className="settings-playground-result-tabs"
                  role="tablist"
                >
                  {AI_PLAYGROUND_RESULT_TABS.map((tab) => (
                    <button
                      aria-controls={`ai-playground-result-panel-${tab.id}`}
                      aria-selected={playgroundResultTab === tab.id}
                      className={`settings-playground-result-tab${playgroundResultTab === tab.id ? " is-active" : ""}`}
                      id={`ai-playground-result-tab-${tab.id}`}
                      key={tab.id}
                      onClick={() => setPlaygroundResultTab(tab.id)}
                      role="tab"
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <section
                  aria-labelledby={`ai-playground-result-tab-${playgroundResultTab}`}
                  className="settings-playground-result settings-playground-result-stack"
                  aria-label="AI playground result"
                  id={`ai-playground-result-panel-${playgroundResultTab}`}
                  role="tabpanel"
                >
                  {playgroundResultTab !== "semanticReview" ? (
                    <section className="settings-playground-stage-card">
                      <div className="settings-playground-stage-header">
                        <div>
                          <span className="settings-playground-stage-label">
                            Pass 1
                          </span>
                          <h3 className="settings-subsection-title">
                            Visual enrichment result
                          </h3>
                        </div>
                        <span className="settings-playground-stage-status">
                          COMPLETE
                        </span>
                      </div>

                      {playgroundResultTab === "overview" ? (
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
                            <dd>
                              {playground.result.completionTokens ?? "N/A"}
                            </dd>
                          </div>
                          <div>
                            <dt>Pass 1 cost</dt>
                            <dd>
                              {formatPlaygroundCost(
                                playground.result.estimatedCostUsd,
                              )}
                            </dd>
                          </div>
                        </dl>
                      ) : null}

                      {playgroundPass1Context ? (
                        <>
                          {playgroundResultTab === "overview" ? (
                            <div className="settings-playground-context-grid">
                              <div className="settings-playground-detail-card">
                                <h4>Catalog fields</h4>
                                <dl className="settings-playground-detail-list">
                                  <div>
                                    <dt>Title</dt>
                                    <dd>
                                      {playgroundPass1Context.normalized.title}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Description</dt>
                                    <dd>
                                      {
                                        playgroundPass1Context.normalized
                                          .description
                                      }
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Category</dt>
                                    <dd>
                                      {playgroundPass1Context.categoryName ??
                                        playgroundPass1Context.normalized
                                          .category}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Visible text</dt>
                                    <dd>
                                      {playgroundPass1Context.normalized.visibleText.join(
                                        ", ",
                                      ) || "None detected"}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                              <div className="settings-playground-detail-card">
                                <h4>Decision preview</h4>
                                <dl className="settings-playground-detail-list">
                                  <div>
                                    <dt>WAA decision</dt>
                                    <dd>
                                      {
                                        playgroundPass1Context
                                          .automationDecision.decision
                                      }
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Hard blockers</dt>
                                    <dd>
                                      {playgroundPass1Context.objectiveBlockers.join(
                                        ", ",
                                      ) || "None"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Semantic blockers</dt>
                                    <dd>
                                      {playgroundPass1Context.semanticBlockers.join(
                                        ", ",
                                      ) || "None"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Automatic reviewer</dt>
                                    <dd>
                                      {playgroundPass1Context.semanticReviewerEnabled
                                        ? "Enabled"
                                        : "OFF — manual Playground action only"}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          ) : null}

                          {playgroundResultTab === "profiles" ? (
                            <div className="settings-playground-profile-grid">
                              <div className="settings-playground-detail-card settings-playground-profile-card">
                                <h4>Smart Profile</h4>
                                <pre>
                                  {formatPlaygroundJson(
                                    playgroundPass1Context.originalSmartProfile,
                                  )}
                                </pre>
                              </div>
                              <div className="settings-playground-detail-card settings-playground-profile-card">
                                <h4>Visual Context Profile</h4>
                                <pre>
                                  {formatPlaygroundJson(
                                    playgroundPass1Context.normalized
                                      .visualContextProfile,
                                  )}
                                </pre>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="settings-field-hint">
                          This result was produced by an older Playground
                          callable and did not include the typed Pass 1 context
                          required for Semantic Review.
                        </p>
                      )}

                      {playgroundResultTab === "response" ? (
                        <div className="settings-playground-output settings-playground-output-compact">
                          <div className="settings-playground-output-header">
                            <h4>Canonical response output</h4>
                            <button
                              aria-label="Copy response output"
                              className="icon-button icon-button-sm icon-button-ghost"
                              onClick={() =>
                                copyBlock(
                                  "first-call",
                                  playgroundResultOutputText,
                                )
                              }
                              type="button"
                            >
                              {copiedBlockId === "first-call" ? (
                                <Check
                                  aria-hidden="true"
                                  size={15}
                                  strokeWidth={2.2}
                                />
                              ) : (
                                <Copy
                                  aria-hidden="true"
                                  size={15}
                                  strokeWidth={2.2}
                                />
                              )}
                            </button>
                          </div>
                          <pre>{playgroundResultOutputText}</pre>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {playgroundResultTab === "semanticReview" ? (
                    <>
                      <section className="settings-playground-stage-card settings-playground-semantic-stage">
                        <div className="settings-playground-stage-header">
                          <div>
                            <span className="settings-playground-stage-label">
                              Pass 2
                            </span>
                            <h3 className="settings-subsection-title">
                              Semantic Review
                            </h3>
                          </div>
                          {playgroundPass1Context ? (
                            <span className="settings-playground-stage-status">
                              {playgroundPass1Context.pass2Eligibility.replace(
                                /_/g,
                                " ",
                              )}
                            </span>
                          ) : null}
                        </div>

                        {!playgroundPass1Context ? (
                          <p className="settings-field-hint">
                            Semantic Review is unavailable until a current Pass
                            1 context is returned.
                          </p>
                        ) : playgroundPass1Context.pass2Eligibility ===
                          "eligible" ? (
                          <>
                            <p className="settings-field-hint">
                              Eligible semantic blockers were found. This
                              explicit text-only review uses the configured
                              Semantic Reviewer model and never resends the
                              image.
                            </p>
                            <div className="settings-form-actions">
                              <Button
                                disabled={
                                  semanticReviewPlayground.attempted ||
                                  semanticReviewPlayground.isRunning
                                }
                                onClick={() =>
                                  void semanticReviewPlayground.runReview()
                                }
                                variant="primary"
                              >
                                {semanticReviewPlayground.isRunning
                                  ? "Running Semantic Review…"
                                  : semanticReviewPlayground.attempted
                                    ? "Semantic Review attempted"
                                    : "Run Semantic Review"}
                              </Button>
                            </div>
                          </>
                        ) : playgroundPass1Context.pass2Eligibility ===
                          "not_needed" ? (
                          <p className="settings-field-hint">
                            Semantic Review is not needed because no eligible
                            semantic blockers were returned.
                          </p>
                        ) : playgroundPass1Context.pass2Eligibility ===
                          "blocked_by_objective" ? (
                          <p className="settings-field-hint">
                            Semantic Review is blocked by objective issues:{" "}
                            {playgroundPass1Context.objectiveBlockers.join(
                              ", ",
                            )}
                            .
                          </p>
                        ) : (
                          <p className="settings-field-hint">
                            Semantic Review is unavailable because the required
                            Visual Context Profile is incomplete. The workflow
                            fails closed.
                          </p>
                        )}

                        {semanticReviewPlayground.error ? (
                          <p
                            className="auth-message auth-message-error"
                            role="alert"
                          >
                            Semantic Review failed:{" "}
                            {semanticReviewPlayground.error}
                          </p>
                        ) : null}
                      </section>

                      {semanticReviewResult ? (
                        <section className="settings-playground-stage-card settings-playground-effective-stage">
                          <div className="settings-playground-stage-header">
                            <div>
                              <span className="settings-playground-stage-label">
                                Effective result
                              </span>
                              <h3 className="settings-subsection-title">
                                Semantic Review outcome
                              </h3>
                            </div>
                            <span className="settings-playground-stage-status">
                              {semanticReviewResult.result.decision}
                            </span>
                          </div>

                          <dl className="settings-playground-result-meta">
                            <div>
                              <dt>Provider</dt>
                              <dd>{semanticReviewResult.provider}</dd>
                            </div>
                            <div>
                              <dt>Model used</dt>
                              <dd>{semanticReviewResult.model}</dd>
                            </div>
                            <div>
                              <dt>Prompt version</dt>
                              <dd>{semanticReviewResult.promptVersion}</dd>
                            </div>
                            <div>
                              <dt>Input tokens</dt>
                              <dd>
                                {semanticReviewResult.promptTokens ?? "N/A"}
                              </dd>
                            </div>
                            <div>
                              <dt>Output tokens</dt>
                              <dd>
                                {semanticReviewResult.completionTokens ?? "N/A"}
                              </dd>
                            </div>
                            <div>
                              <dt>Pass 2 cost</dt>
                              <dd>
                                {formatPlaygroundCost(
                                  semanticReviewResult.estimatedCostUsd,
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Combined AI cost</dt>
                              <dd>{combinedPlaygroundCost}</dd>
                            </div>
                            <div>
                              <dt>Final WAA decision</dt>
                              <dd>
                                {
                                  semanticReviewResult.finalAutomationDecision
                                    .decision
                                }
                              </dd>
                            </div>
                          </dl>

                          <div className="settings-playground-context-grid">
                            <div className="settings-playground-detail-card">
                              <h4>Decision</h4>
                              <dl className="settings-playground-detail-list">
                                <div>
                                  <dt>Reason</dt>
                                  <dd>{semanticReviewResult.result.reason}</dd>
                                </div>
                                <div>
                                  <dt>Resolved blockers</dt>
                                  <dd>
                                    {semanticReviewResult.result.blockersResolved.join(
                                      ", ",
                                    ) || "None"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Unresolved blockers</dt>
                                  <dd>
                                    {semanticReviewResult.result.blockersUnresolved.join(
                                      ", ",
                                    ) || "None"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Final objective blockers</dt>
                                  <dd>
                                    {semanticReviewResult.finalObjectiveBlockers.join(
                                      ", ",
                                    ) || "None"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Final semantic blockers</dt>
                                  <dd>
                                    {semanticReviewResult.finalSemanticBlockers.join(
                                      ", ",
                                    ) || "None"}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                            <div className="settings-playground-detail-card">
                              <h4>Validated patches</h4>
                              <pre>
                                {formatPlaygroundJson(
                                  semanticReviewResult.result.patches ?? [],
                                )}
                              </pre>
                            </div>
                          </div>

                          <div className="settings-playground-profile-grid settings-playground-effective-detail-grid">
                            <div className="settings-playground-detail-card settings-playground-profile-card">
                              <h4>Original Smart Profile</h4>
                              <pre>
                                {formatPlaygroundJson(
                                  semanticReviewResult.originalSmartProfile,
                                )}
                              </pre>
                            </div>
                            <div className="settings-playground-detail-card settings-playground-profile-card">
                              <h4>Effective Smart Profile</h4>
                              <pre>
                                {formatPlaygroundJson(
                                  semanticReviewResult.effectiveSmartProfile,
                                )}
                              </pre>
                            </div>
                            <div className="settings-playground-detail-card settings-playground-profile-card">
                              <h4>Final WAA preview</h4>
                              <pre>
                                {formatPlaygroundJson(
                                  semanticReviewResult.finalAutomationDecision,
                                )}
                              </pre>
                            </div>
                          </div>
                        </section>
                      ) : null}
                    </>
                  ) : null}
                </section>
              </ModalBody>
            </Modal>
          </div>
        </div>
      ) : null}
    </main>
  );
}
