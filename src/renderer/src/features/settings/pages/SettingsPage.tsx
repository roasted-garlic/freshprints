import { Settings } from "lucide-react";

import { ComingSoonPage } from "../../../shared/pages/ComingSoonPage";

export function SettingsPage() {
  return (
    <ComingSoonPage
      description="Configure platform settings, integrations, and operational preferences."
      message="Application settings and configuration controls will be added in a future phase."
      title="Settings"
    >
      <Settings aria-hidden="true" className="coming-soon-icon" size={48} strokeWidth={1.5} />
    </ComingSoonPage>
  );
}
