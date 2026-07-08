import type { DesignListQuery } from "../../designs/types/designQuery.types";
import type { AiReviewInboxFilters, AiReviewInboxTab } from "../types/aiReviewInbox.types";

export const AI_PROCESSING_PAGE_TITLE = "AI Processing";
export const AI_PROCESSING_PAGE_DESCRIPTION =
  "Process imported designs — review AI metadata and approve into the Design Library.";

export const AI_REVIEW_TAB_QUERY_PARAM = "tab";

/** @deprecated Legacy URL params — stripped on load */
export const AI_REVIEW_SEARCH_QUERY_PARAM = "search";
/** @deprecated Legacy URL params — stripped on load */
export const AI_REVIEW_CATEGORY_QUERY_PARAM = "category";
/** @deprecated Legacy URL params — stripped on load */
export const AI_REVIEW_SORT_QUERY_PARAM = "sort";

export const AI_REVIEW_INBOX_TABS: readonly { id: AiReviewInboxTab; label: string }[] = [
  { id: "processing", label: "Processing" },
  { id: "needs_review", label: "Needs Review" },
  { id: "rejected", label: "Rejected" },
] as const;

export const DEFAULT_AI_REVIEW_INBOX_FILTERS: AiReviewInboxFilters = {
  tab: "processing",
};

export function parseAiReviewInboxTab(value: string | null): AiReviewInboxTab {
  if (value === "needs_review" || value === "rejected" || value === "processing") {
    return value;
  }

  return DEFAULT_AI_REVIEW_INBOX_FILTERS.tab;
}

export function parseAiReviewInboxFilters(searchParams: URLSearchParams): AiReviewInboxFilters {
  return {
    tab: parseAiReviewInboxTab(searchParams.get(AI_REVIEW_TAB_QUERY_PARAM)),
  };
}

export function buildAiReviewInboxSearchParams(filters: AiReviewInboxFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (filters.tab !== DEFAULT_AI_REVIEW_INBOX_FILTERS.tab) {
    searchParams.set(AI_REVIEW_TAB_QUERY_PARAM, filters.tab);
  }

  return searchParams;
}

export function getAiReviewEmptyState(tab: AiReviewInboxTab): { copy: string; title: string } {
  switch (tab) {
    case "processing":
      return {
        title: "No designs processing",
        copy: "No designs are currently processing.",
      };
    case "needs_review":
      return {
        title: "No designs need review",
        copy: "No designs need review.",
      };
    case "rejected":
      return {
        title: "No rejected designs",
        copy: "No rejected designs.",
      };
    default:
      return {
        title: "Queue clear",
        copy: "New imports will appear here.",
      };
  }
}

export function getAiReviewTabDescription(tab: AiReviewInboxTab): string {
  switch (tab) {
    case "processing":
      return "Designs waiting for AI or currently being processed.";
    case "needs_review":
      return "AI output ready for staff review and approval.";
    case "rejected":
      return "Rejected designs retained for audit or re-open.";
    default:
      return "";
  }
}

export function buildAiReviewInboxListQuery(filters: AiReviewInboxFilters): DesignListQuery {
  const baseQuery: DesignListQuery = {
    sortDirection: "desc",
    sortField: "updatedAt",
  };

  switch (filters.tab) {
    case "processing":
      return {
        ...baseQuery,
        statusIn: ["imported", "processing"],
        aiReviewStatus: "pending",
      };
    case "needs_review":
      return {
        ...baseQuery,
        status: "imported",
        aiReviewStatus: "needs_review",
      };
    case "rejected":
      return {
        ...baseQuery,
        status: "rejected",
      };
    default:
      return baseQuery;
  }
}
