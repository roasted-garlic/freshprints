import { useEffect, useState } from "react";

import type { SuggestedNewTag } from "../../../../../../shared/types/catalogTag.types";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Button } from "../../../shared/components/Button";
import { CatalogAliasChipInput } from "../../../shared/components/CatalogAliasChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import type { CreateCatalogTagInput } from "../../designs/types/catalogTag.types";

interface AiReviewSuggestedTagsSectionProps {
  canApproveSuggestedTags: boolean;
  isSubmitting: boolean;
  onApproveSuggestedTag: (
    sourceName: string,
    input: CreateCatalogTagInput,
    addToDraft: boolean,
  ) => Promise<void> | void;
  onIgnoreSuggestedTag: (name: string) => void;
  suggestedNewTags: SuggestedNewTag[];
}

interface SuggestedTagFormValues {
  aliasesInput: string;
  name: string;
  preferredWhen: string;
}

function mapSuggestionToFormValues(tag: SuggestedNewTag): SuggestedTagFormValues {
  return {
    aliasesInput: tag.aliases.join(", "),
    name: tag.name,
    preferredWhen: tag.preferredWhen,
  };
}

function parseAliasesInput(value: string): string[] {
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function buildForms(suggestedNewTags: SuggestedNewTag[]): Record<string, SuggestedTagFormValues> {
  return Object.fromEntries(
    suggestedNewTags.map((tag) => [tag.name, mapSuggestionToFormValues(tag)]),
  );
}

export function AiReviewSuggestedTagsSection({
  canApproveSuggestedTags,
  isSubmitting,
  onApproveSuggestedTag,
  onIgnoreSuggestedTag,
  suggestedNewTags,
}: AiReviewSuggestedTagsSectionProps) {
  const [formsByName, setFormsByName] = useState<Record<string, SuggestedTagFormValues>>({});

  useEffect(() => {
    setFormsByName(buildForms(suggestedNewTags));
  }, [suggestedNewTags]);

  if (suggestedNewTags.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Suggested new tags"
      className="ai-review-workspace-section ai-review-suggested-tags-section"
    >
      <div className="ai-review-workspace-section-header">
        <div>
          <h3 className="ai-review-workspace-section-title">Suggested New Tags</h3>
          <p className="ai-review-suggested-tags-note">
            These AI tags did not match an approved tag name or alias.
          </p>
        </div>
      </div>

      <div className="ai-review-suggested-tags-list" role="list">
        {suggestedNewTags.map((tag) => {
          const formValues = formsByName[tag.name] ?? mapSuggestionToFormValues(tag);

          return (
            <article className="ai-review-suggested-tag-card" key={tag.name} role="listitem">
              <div className="ai-review-suggested-tag-form">
                <TextInput
                  disabled={!canApproveSuggestedTags || isSubmitting}
                  label="Name"
                  name={`suggestedTagName-${tag.name}`}
                  onChange={(event) =>
                    setFormsByName((currentForms) => ({
                      ...currentForms,
                      [tag.name]: {
                        ...formValues,
                        name: event.target.value,
                      },
                    }))
                  }
                  value={formValues.name}
                />
                <CatalogAliasChipInput
                  disabled={!canApproveSuggestedTags || isSubmitting}
                  label="Aliases"
                  name={`suggestedTagAliases-${tag.name}`}
                  onChange={(value) =>
                    setFormsByName((currentForms) => ({
                      ...currentForms,
                      [tag.name]: {
                        ...formValues,
                        aliasesInput: value,
                      },
                    }))
                  }
                  value={formValues.aliasesInput}
                />
                <AutoResizeTextarea
                  disabled={!canApproveSuggestedTags || isSubmitting}
                  label="Preferred when"
                  name={`suggestedTagPreferredWhen-${tag.name}`}
                  onChange={(event) =>
                    setFormsByName((currentForms) => ({
                      ...currentForms,
                      [tag.name]: {
                        ...formValues,
                        preferredWhen: event.target.value,
                      },
                    }))
                  }
                  value={formValues.preferredWhen}
                />
              </div>

              {tag.reason ? (
                <p className="ai-review-suggested-tags-note">{tag.reason}</p>
              ) : null}

              <div className="ai-review-suggested-tag-actions">
                <Button
                  disabled={isSubmitting}
                  onClick={() => onIgnoreSuggestedTag(tag.name)}
                  size="sm"
                  variant="secondary"
                >
                  Ignore
                </Button>
                <Button
                  disabled={!canApproveSuggestedTags || isSubmitting}
                  onClick={() =>
                    void onApproveSuggestedTag(
                      tag.name,
                      {
                        aliases: parseAliasesInput(formValues.aliasesInput),
                        name: formValues.name,
                        preferredWhen: formValues.preferredWhen,
                      },
                      false,
                    )
                  }
                  size="sm"
                  variant="primary"
                >
                  Approve
                </Button>
                <Button
                  disabled={!canApproveSuggestedTags || isSubmitting}
                  onClick={() =>
                    void onApproveSuggestedTag(
                      tag.name,
                      {
                        aliases: parseAliasesInput(formValues.aliasesInput),
                        name: formValues.name,
                        preferredWhen: formValues.preferredWhen,
                      },
                      true,
                    )
                  }
                  size="sm"
                  variant="success"
                >
                  Approve + add
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {!canApproveSuggestedTags ? (
        <p className="ai-review-suggested-tags-note">
          Suggested tag approval requires owner or admin access.
        </p>
      ) : null}
    </section>
  );
}
