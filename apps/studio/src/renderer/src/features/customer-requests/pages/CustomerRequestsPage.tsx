import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Binoculars, MessageSquare, Sparkles, Wand2 } from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { EtsySuggestionListsSettingsSection } from "../../settings/components/EtsySuggestionListsSettingsSection";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { AssistedCreationRequestsSection } from "../components/AssistedCreationRequestsSection";
import { BrowseSubjectsAndTonesModal } from "../components/BrowseSubjectsAndTonesModal";
import { EtsyPendingSuggestionRequestsSection } from "../components/EtsyPendingSuggestionRequestsSection";
import { EtsyRecommendationRequestsSection } from "../components/EtsyRecommendationRequestsSection";
import {
  CUSTOMER_REQUEST_TAB_QUERY_PARAM,
  isCustomerRequestPageTab,
  type CustomerRequestPageTab,
} from "../constants/customerRequestRoutes";

export function CustomerRequestsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageOverlays = permissionService.canManageSettings(user);
  const tabFromUrl = searchParams.get(CUSTOMER_REQUEST_TAB_QUERY_PARAM);
  const [tab, setTab] = useState<CustomerRequestPageTab>(
    isCustomerRequestPageTab(tabFromUrl) ? tabFromUrl : "assisted",
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [browseListsOpen, setBrowseListsOpen] = useState(false);

  const openBrowseLists = useCallback(() => {
    setBrowseListsOpen(true);
  }, []);

  useEffect(() => {
    if (isCustomerRequestPageTab(tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [tab, tabFromUrl]);

  const selectTab = useCallback(
    (next: CustomerRequestPageTab) => {
      setTab(next);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set(CUSTOMER_REQUEST_TAB_QUERY_PARAM, next);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Custom Designs",
        description:
          "Assisted creation, AI (soon), Etsy Find searches, and suggestion approvals.",
        search: null,
        actions: null,
        primaryAction: null,
      }),
      [],
    ),
  );

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (tab !== "suggestions") {
      setBrowseListsOpen(false);
    }
  }, [tab]);

  return (
    <main className="page-layout page-layout-shell customer-requests-page">
      <div className="staff-inbox-page-tabs" role="tablist" aria-label="Custom Designs request types">
        <button
          aria-selected={tab === "assisted"}
          className={`staff-inbox-page-tab${tab === "assisted" ? " is-active" : ""}`}
          onClick={() => selectTab("assisted")}
          role="tab"
          type="button"
        >
          <Wand2 aria-hidden="true" size={16} strokeWidth={2} />
          Assisted
        </button>
        <button
          aria-selected={tab === "ai"}
          className={`staff-inbox-page-tab${tab === "ai" ? " is-active" : ""}`}
          onClick={() => selectTab("ai")}
          role="tab"
          type="button"
        >
          <Sparkles aria-hidden="true" size={16} strokeWidth={2} />
          AI
        </button>
        <button
          aria-selected={tab === "etsy_search"}
          className={`staff-inbox-page-tab${tab === "etsy_search" ? " is-active" : ""}`}
          onClick={() => selectTab("etsy_search")}
          role="tab"
          type="button"
        >
          <Binoculars aria-hidden="true" size={16} strokeWidth={2} />
          Etsy
        </button>
        <button
          aria-selected={tab === "suggestions"}
          className={`staff-inbox-page-tab${tab === "suggestions" ? " is-active" : ""}`}
          onClick={() => selectTab("suggestions")}
          role="tab"
          type="button"
        >
          <MessageSquare aria-hidden="true" size={16} strokeWidth={2} />
          Suggestions
        </button>
      </div>

      {tab === "etsy_search" ? <EtsyRecommendationRequestsSection /> : null}

      {tab === "suggestions" ? (
        <div className="customer-requests-suggestions-stack">
          <EtsyPendingSuggestionRequestsSection
            canResolve={canManageOverlays}
            onToast={setToastMessage}
          />
          <EtsySuggestionListsSettingsSection
            canManage={canManageOverlays}
            onBrowseSubjectsAndTones={openBrowseLists}
          />
        </div>
      ) : null}

      {tab === "ai" ? (
        <section className="card settings-section">
          <p className="settings-section-description">
            Coming soon. Portal AI Design submissions will land here for staff review.
          </p>
        </section>
      ) : null}

      {tab === "assisted" ? (
        <AssistedCreationRequestsSection
          canMutate={canManageOverlays}
          canRestore={permissionService.isOwner(user)}
          onToast={setToastMessage}
        />
      ) : null}

      {browseListsOpen ? (
        <BrowseSubjectsAndTonesModal onClose={() => setBrowseListsOpen(false)} />
      ) : null}

      {toastMessage ? (
        <div className="settings-etsy-suggest-toast" role="status">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
