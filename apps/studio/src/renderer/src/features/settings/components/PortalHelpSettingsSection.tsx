import { useEffect, useState } from "react";

import {
  PORTAL_HELP_FAQ_ANSWER_MAX_LENGTH,
  PORTAL_HELP_FAQ_QUESTION_MAX_LENGTH,
  PORTAL_HELP_MAX_FAQS,
  PORTAL_HELP_MAX_VIDEOS,
  PORTAL_HELP_PAGE_TITLE,
  PORTAL_HELP_VIDEO_DESCRIPTION_MAX_LENGTH,
  PORTAL_HELP_VIDEO_TITLE_MAX_LENGTH,
  PORTAL_HELP_VIDEO_URL_MAX_LENGTH,
  parsePortalHelpSettingsInput,
  type PortalHelpSettings,
  type PortalHelpTextFaq,
  type PortalHelpVideoItem,
} from "@fresh-prints/shared/constants/portal/portalHelpSettings.constants";
import { Button } from "../../../shared/components/Button";
import { usePortalHelpSettings } from "../hooks/usePortalHelpSettings";

type HelpDraft = {
  faqs: PortalHelpTextFaq[];
  videos: PortalHelpVideoItem[];
};

function settingsToDraft(settings: PortalHelpSettings): HelpDraft {
  return {
    faqs: settings.faqs.map((faq) => ({ ...faq })),
    videos: settings.videos.map((video) => ({ ...video })),
  };
}

function draftEqualsSettings(draft: HelpDraft, settings: PortalHelpSettings): boolean {
  return JSON.stringify(draft) === JSON.stringify(settingsToDraft(settings));
}

function createHelpItemId(prefix: "faq" | "video"): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now()}`;
  return `${prefix}-${suffix}`;
}

function renumberOrders<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) {
    return items;
  }
  const next = [...items];
  const [removed] = next.splice(index, 1);
  next.splice(target, 0, removed!);
  return renumberOrders(next as Array<T & { order: number }>) as T[];
}

function toggleOpenId(openIds: ReadonlySet<string>, id: string, open: boolean): Set<string> {
  const next = new Set(openIds);
  if (open) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

function faqSummaryLabel(faq: PortalHelpTextFaq): string {
  const question = faq.question.trim();
  return question.length > 0 ? question : "New FAQ";
}

function videoSummaryLabel(video: PortalHelpVideoItem): string {
  const title = video.title.trim();
  return title.length > 0 ? title : "New video";
}

export function PortalHelpSettingsSection() {
  const { docStatus, error, isLoading, isSaving, save, saved, settings } = usePortalHelpSettings();
  const [draft, setDraft] = useState<HelpDraft>(() => settingsToDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openFaqIds, setOpenFaqIds] = useState<ReadonlySet<string>>(() => new Set());
  const [openVideoIds, setOpenVideoIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setValidationError(null);
  }, [settings]);

  function updateFaqs(faqs: PortalHelpTextFaq[]) {
    setValidationError(null);
    setDraft((current) => ({ ...current, faqs: renumberOrders(faqs) }));
  }

  function updateVideos(videos: PortalHelpVideoItem[]) {
    setValidationError(null);
    setDraft((current) => ({ ...current, videos: renumberOrders(videos) }));
  }

  async function handleSave() {
    const parsed = parsePortalHelpSettingsInput(draft);
    if (!parsed) {
      setValidationError(
        "Check FAQ question/answer text, unique ids, item limits, and HTTPS YouTube or Vimeo video URLs (empty video URLs cannot be saved).",
      );
      return;
    }
    setValidationError(null);
    const ok = await save(parsed);
    if (ok) {
      setOpenFaqIds(new Set());
      setOpenVideoIds(new Set());
    }
  }

  const displayError = validationError ?? error;
  const isDirty = !draftEqualsSettings(draft, settings);

  return (
    <section aria-labelledby="portal-help-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="portal-help-settings-title">
          {PORTAL_HELP_PAGE_TITLE}
        </h2>
        <p className="settings-section-description">
          Edit Portal <code>/help</code> text FAQs and How To video embeds. Answers are plain text
          only (no HTML). Video URLs must be HTTPS YouTube or Vimeo. Changes publish live after
          save — no Portal redeploy. Empty FAQ list → Portal bundled FAQ defaults. Empty video list
          → Portal shows Coming soon (no placeholder videos). If this doc already has old
          placeholder FAQ text, remove those items and Save, or replace the questions/answers with
          your copy — Portal only uses bundled FAQ defaults when the saved FAQ list is empty.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading FAQ and How To settings…
        </p>
      ) : (
        <div className="settings-form-grid">
          {docStatus === "missing" ? (
            <p aria-live="polite" className="settings-section-status">
              No saved settings yet. Portal uses bundled FAQ defaults and Coming soon for videos
              until you save.
            </p>
          ) : null}

          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">
              Text FAQs ({draft.faqs.length}/{PORTAL_HELP_MAX_FAQS})
            </legend>

            {draft.faqs.length === 0 ? (
              <p className="settings-field-hint">No text FAQs yet.</p>
            ) : null}

            {draft.faqs.map((faq, index) => {
              const isOpen = openFaqIds.has(faq.id);
              const panelId = `portalHelpFaqPanel-${faq.id}`;
              return (
                <details
                  className="settings-help-item"
                  key={faq.id}
                  onToggle={(event) => {
                    const nextOpen = event.currentTarget.open;
                    if (nextOpen === isOpen) {
                      return;
                    }
                    setOpenFaqIds((current) => toggleOpenId(current, faq.id, nextOpen));
                  }}
                  open={isOpen}
                >
                  <summary
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="settings-help-item-summary"
                  >
                    <span className="settings-help-item-summary-label">
                      FAQ {index + 1}: {faqSummaryLabel(faq)}
                    </span>
                  </summary>
                  <div className="settings-help-item-body" id={panelId}>
                    <div className="settings-help-item-toolbar">
                      <span className="settings-field-hint">Edit FAQ {index + 1}</span>
                      <div className="settings-form-actions">
                        <Button
                          disabled={isSaving || index === 0}
                          onClick={() => updateFaqs(moveItem(draft.faqs, index, -1))}
                          type="button"
                          variant="secondary"
                        >
                          Move up
                        </Button>
                        <Button
                          disabled={isSaving || index >= draft.faqs.length - 1}
                          onClick={() => updateFaqs(moveItem(draft.faqs, index, 1))}
                          type="button"
                          variant="secondary"
                        >
                          Move down
                        </Button>
                        <Button
                          disabled={isSaving}
                          onClick={() => {
                            setOpenFaqIds((current) => {
                              const next = new Set(current);
                              next.delete(faq.id);
                              return next;
                            });
                            updateFaqs(draft.faqs.filter((_, faqIndex) => faqIndex !== index));
                          }}
                          type="button"
                          variant="secondary"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <label
                      className="settings-field-label"
                      htmlFor={`portalHelpFaqQuestion-${faq.id}`}
                    >
                      Question
                      <input
                        className="settings-text-input"
                        id={`portalHelpFaqQuestion-${faq.id}`}
                        maxLength={PORTAL_HELP_FAQ_QUESTION_MAX_LENGTH}
                        onChange={(event) => {
                          const next = [...draft.faqs];
                          next[index] = { ...faq, question: event.target.value };
                          updateFaqs(next);
                        }}
                        type="text"
                        value={faq.question}
                      />
                      <span className="settings-field-hint">
                        {faq.question.trim().length}/{PORTAL_HELP_FAQ_QUESTION_MAX_LENGTH}
                      </span>
                    </label>
                    <label
                      className="settings-field-label"
                      htmlFor={`portalHelpFaqAnswer-${faq.id}`}
                    >
                      Answer (plain text)
                      <textarea
                        className="settings-textarea-input"
                        id={`portalHelpFaqAnswer-${faq.id}`}
                        maxLength={PORTAL_HELP_FAQ_ANSWER_MAX_LENGTH}
                        onChange={(event) => {
                          const next = [...draft.faqs];
                          next[index] = { ...faq, answer: event.target.value };
                          updateFaqs(next);
                        }}
                        rows={4}
                        value={faq.answer}
                      />
                      <span className="settings-field-hint">
                        {faq.answer.trim().length}/{PORTAL_HELP_FAQ_ANSWER_MAX_LENGTH}
                      </span>
                    </label>
                  </div>
                </details>
              );
            })}

            <Button
              disabled={isSaving || draft.faqs.length >= PORTAL_HELP_MAX_FAQS}
              onClick={() => {
                const id = createHelpItemId("faq");
                updateFaqs([
                  ...draft.faqs,
                  {
                    id,
                    question: "",
                    answer: "",
                    order: draft.faqs.length,
                  },
                ]);
                setOpenFaqIds((current) => toggleOpenId(current, id, true));
              }}
              type="button"
              variant="secondary"
            >
              Add FAQ
            </Button>
          </fieldset>

          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">
              How To videos ({draft.videos.length}/{PORTAL_HELP_MAX_VIDEOS})
            </legend>

            {draft.videos.length === 0 ? (
              <p className="settings-field-hint">No How To videos yet.</p>
            ) : null}

            {draft.videos.map((video, index) => {
              const isOpen = openVideoIds.has(video.id);
              const panelId = `portalHelpVideoPanel-${video.id}`;
              return (
                <details
                  className="settings-help-item"
                  key={video.id}
                  onToggle={(event) => {
                    const nextOpen = event.currentTarget.open;
                    if (nextOpen === isOpen) {
                      return;
                    }
                    setOpenVideoIds((current) => toggleOpenId(current, video.id, nextOpen));
                  }}
                  open={isOpen}
                >
                  <summary
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="settings-help-item-summary"
                  >
                    <span className="settings-help-item-summary-label">
                      Video {index + 1}: {videoSummaryLabel(video)}
                    </span>
                  </summary>
                  <div className="settings-help-item-body" id={panelId}>
                    <div className="settings-help-item-toolbar">
                      <span className="settings-field-hint">Edit video {index + 1}</span>
                      <div className="settings-form-actions">
                        <Button
                          disabled={isSaving || index === 0}
                          onClick={() => updateVideos(moveItem(draft.videos, index, -1))}
                          type="button"
                          variant="secondary"
                        >
                          Move up
                        </Button>
                        <Button
                          disabled={isSaving || index >= draft.videos.length - 1}
                          onClick={() => updateVideos(moveItem(draft.videos, index, 1))}
                          type="button"
                          variant="secondary"
                        >
                          Move down
                        </Button>
                        <Button
                          disabled={isSaving}
                          onClick={() => {
                            setOpenVideoIds((current) => {
                              const next = new Set(current);
                              next.delete(video.id);
                              return next;
                            });
                            updateVideos(
                              draft.videos.filter((_, videoIndex) => videoIndex !== index),
                            );
                          }}
                          type="button"
                          variant="secondary"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <label
                      className="settings-field-label"
                      htmlFor={`portalHelpVideoTitle-${video.id}`}
                    >
                      Title
                      <input
                        className="settings-text-input"
                        id={`portalHelpVideoTitle-${video.id}`}
                        maxLength={PORTAL_HELP_VIDEO_TITLE_MAX_LENGTH}
                        onChange={(event) => {
                          const next = [...draft.videos];
                          next[index] = { ...video, title: event.target.value };
                          updateVideos(next);
                        }}
                        type="text"
                        value={video.title}
                      />
                      <span className="settings-field-hint">
                        {video.title.trim().length}/{PORTAL_HELP_VIDEO_TITLE_MAX_LENGTH}
                      </span>
                    </label>
                    <label
                      className="settings-field-label"
                      htmlFor={`portalHelpVideoDescription-${video.id}`}
                    >
                      Description (optional)
                      <input
                        className="settings-text-input"
                        id={`portalHelpVideoDescription-${video.id}`}
                        maxLength={PORTAL_HELP_VIDEO_DESCRIPTION_MAX_LENGTH}
                        onChange={(event) => {
                          const next = [...draft.videos];
                          const description = event.target.value;
                          next[index] = {
                            ...video,
                            ...(description.trim()
                              ? { description }
                              : { description: undefined }),
                          };
                          updateVideos(next);
                        }}
                        type="text"
                        value={video.description ?? ""}
                      />
                      <span className="settings-field-hint">
                        {(video.description ?? "").trim().length}/
                        {PORTAL_HELP_VIDEO_DESCRIPTION_MAX_LENGTH}
                      </span>
                    </label>
                    <label
                      className="settings-field-label"
                      htmlFor={`portalHelpVideoUrl-${video.id}`}
                    >
                      Video URL (HTTPS YouTube or Vimeo)
                      <input
                        className="settings-text-input"
                        id={`portalHelpVideoUrl-${video.id}`}
                        maxLength={PORTAL_HELP_VIDEO_URL_MAX_LENGTH}
                        onChange={(event) => {
                          const next = [...draft.videos];
                          next[index] = { ...video, videoUrl: event.target.value };
                          updateVideos(next);
                        }}
                        placeholder="https://www.youtube.com/watch?v=…"
                        type="url"
                        value={video.videoUrl}
                      />
                      <span className="settings-field-hint">
                        {video.videoUrl.trim().length}/{PORTAL_HELP_VIDEO_URL_MAX_LENGTH}
                      </span>
                    </label>
                  </div>
                </details>
              );
            })}

            <Button
              disabled={isSaving || draft.videos.length >= PORTAL_HELP_MAX_VIDEOS}
              onClick={() => {
                const id = createHelpItemId("video");
                updateVideos([
                  ...draft.videos,
                  {
                    id,
                    title: "",
                    videoUrl: "",
                    order: draft.videos.length,
                  },
                ]);
                setOpenVideoIds((current) => toggleOpenId(current, id, true));
              }}
              type="button"
              variant="secondary"
            >
              Add How To video
            </Button>
          </fieldset>

          <div className="settings-form-actions">
            <Button
              disabled={isSaving || !isDirty}
              onClick={() => {
                setValidationError(null);
                setDraft(settingsToDraft(settings));
                setOpenFaqIds(new Set());
                setOpenVideoIds(new Set());
              }}
              type="button"
              variant="secondary"
            >
              Discard changes
            </Button>
            <Button
              disabled={isSaving || !isDirty}
              onClick={() => {
                void handleSave();
              }}
              type="button"
              variant="primary"
            >
              {isSaving ? "Saving…" : "Save FAQ and How To"}
            </Button>
          </div>

          {saved && !displayError && !isDirty ? (
            <p aria-live="polite" className="auth-message auth-message-success">
              FAQ and How To settings saved.
            </p>
          ) : null}
          {displayError ? (
            <p className="auth-message auth-message-error" role="alert">
              {displayError}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
