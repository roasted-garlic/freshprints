import { useMemo } from "react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { CustomerUploadIntakeSection } from "../components/CustomerUploadIntakeSection";

export function CustomerUploadsPage() {
  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Customer Uploads",
        description:
          "Review Portal request artwork before sending it to AI Processing or excluding it from the shared Design Library.",
        search: null,
        primaryAction: null,
      }),
      [],
    ),
  );

  return (
    <main className="page-layout page-layout-shell customer-uploads-page">
      <CustomerUploadIntakeSection />
    </main>
  );
}
