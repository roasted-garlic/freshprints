import { useMemo } from "react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { StudioUpdatesSettingsSection } from "../components/StudioUpdatesSettingsSection";

/** Helpers see only Studio updates under Settings — no other settings tabs. */
export function HelperSettingsPage() {
  const shellHeaderConfig = useMemo(
    () => ({
      title: "Settings",
      description: "Check for and install Studio updates.",
    }),
    [],
  );

  useShellHeaderConfig(shellHeaderConfig);

  return (
    <main className="page-layout page-layout-shell settings-page">
      <StudioUpdatesSettingsSection />
    </main>
  );
}
