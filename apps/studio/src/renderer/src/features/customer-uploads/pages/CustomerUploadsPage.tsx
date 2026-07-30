import { useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { CustomerUploadIntakeSection } from "../components/CustomerUploadIntakeSection";
import { useCustomerUploadIntake } from "../hooks/useCustomerUploadIntake";
import { invokeCustomerUploadRefresh } from "../utils/customerUploadRefreshAction";

export function CustomerUploadsPage() {
  const intake = useCustomerUploadIntake({ purposeScope: "print_request" });
  const { canView, refresh } = intake;

  const handleRefresh = useCallback(() => {
    invokeCustomerUploadRefresh(refresh);
  }, [refresh]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Uploaded Designs",
        description:
          "Artwork customers attach to print requests. Review here, then send to AI Processing or exclude from the catalog.",
        search: null,
        actions: canView
          ? [
              {
                icon: <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />,
                label: "Refresh",
                onClick: handleRefresh,
              },
            ]
          : null,
        primaryAction: null,
      }),
      [canView, handleRefresh],
    ),
  );

  return (
    <main className="page-layout page-layout-shell customer-uploads-page">
      <CustomerUploadIntakeSection intake={intake} purposeScope="print_request" />
    </main>
  );
}
