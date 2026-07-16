import { useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { CustomerUploadIntakeSection } from "../components/CustomerUploadIntakeSection";
import { useCustomerUploadIntake } from "../hooks/useCustomerUploadIntake";

export function CustomerUploadsPage() {
  const intake = useCustomerUploadIntake({ purposeScope: "print_request" });

  const handleRefresh = useCallback(() => {
    void intake.refresh();
  }, [intake.refresh]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Uploaded Designs",
        description:
          "Artwork customers attach to print requests. Review here, then send to AI Processing or exclude from the catalog.",
        search: null,
        actions: intake.canView
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
      [handleRefresh, intake.canView],
    ),
  );

  return (
    <main className="page-layout page-layout-shell customer-uploads-page">
      <CustomerUploadIntakeSection intake={intake} purposeScope="print_request" />
    </main>
  );
}
