import { useMemo } from "react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { CustomerUploadIntakeSection } from "../components/CustomerUploadIntakeSection";

export function DonatedDesignsPage() {
  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Donated Designs",
        description:
          "Review Portal catalog donations before sending them to AI Processing or excluding them from the shared Design Library.",
        search: null,
        primaryAction: null,
      }),
      [],
    ),
  );

  return (
    <main className="page-layout page-layout-shell customer-uploads-page">
      <CustomerUploadIntakeSection purposeScope="catalog_donation" />
    </main>
  );
}
