import { useEffect, useMemo, useState } from "react";
import { Binoculars, MessageSquare, Sparkles, Wand2 } from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { EtsySuggestionListsSettingsSection } from "../../settings/components/EtsySuggestionListsSettingsSection";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { EtsyPendingSuggestionRequestsSection } from "../components/EtsyPendingSuggestionRequestsSection";
import { EtsyRecommendationRequestsSection } from "../components/EtsyRecommendationRequestsSection";
import { AssistedCreationRequestsSection } from "../components/AssistedCreationRequestsSection";

type CustomerRequestsTab = "etsy_search" | "suggestions" | "ai" | "assisted";

export function CustomerRequestsPage() {
  const { user } = useAuth();
  const canManageOverlays = permissionService.canManageSettings(user);
  const [tab, setTab] = useState<CustomerRequestsTab>("assisted");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Custom Designs",
        description:
          "Assisted creation, AI (soon), Etsy Find searches, and suggestion approvals.",
        search: null,
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

  return (
    <main className="page-layout page-layout-shell customer-requests-page">
      <div className="staff-inbox-page-tabs" role="tablist" aria-label="Custom Designs request types">
        <button
          aria-selected={tab === "assisted"}
          className={`staff-inbox-page-tab${tab === "assisted" ? " is-active" : ""}`}
          onClick={() => setTab("assisted")}
          role="tab"
          type="button"
        >
          <Wand2 aria-hidden="true" size={16} strokeWidth={2} />
          Assisted
        </button>
        <button
          aria-selected={tab === "ai"}
          className={`staff-inbox-page-tab${tab === "ai" ? " is-active" : ""}`}
          onClick={() => setTab("ai")}
          role="tab"
          type="button"
        >
          <Sparkles aria-hidden="true" size={16} strokeWidth={2} />
          AI
        </button>
        <button
          aria-selected={tab === "etsy_search"}
          className={`staff-inbox-page-tab${tab === "etsy_search" ? " is-active" : ""}`}
          onClick={() => setTab("etsy_search")}
          role="tab"
          type="button"
        >
          <Binoculars aria-hidden="true" size={16} strokeWidth={2} />
          Etsy
        </button>
        <button
          aria-selected={tab === "suggestions"}
          className={`staff-inbox-page-tab${tab === "suggestions" ? " is-active" : ""}`}
          onClick={() => setTab("suggestions")}
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
          <EtsySuggestionListsSettingsSection canManage={canManageOverlays} />
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

      {toastMessage ? (
        <div className="settings-etsy-suggest-toast" role="status">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
