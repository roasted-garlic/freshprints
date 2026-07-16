import { useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { CustomerUploadIntakeSection } from "../components/CustomerUploadIntakeSection";
import { useCustomerUploadIntake } from "../hooks/useCustomerUploadIntake";

export function DonatedDesignsPage() {
  const intake = useCustomerUploadIntake({ purposeScope: "catalog_donation" });

  const handleRefresh = useCallback(() => {
    void intake.refresh();
  }, [intake.refresh]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Donated Designs",
        description:
          "Customer donations for the shared Design Library. Review here, then send to AI Processing or exclude.",
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
      <CustomerUploadIntakeSection intake={intake} purposeScope="catalog_donation" />
    </main>
  );
}
