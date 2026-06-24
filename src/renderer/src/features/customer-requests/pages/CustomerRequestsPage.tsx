import { MessageSquare } from "lucide-react";

import { ComingSoonPage } from "../../../shared/pages/ComingSoonPage";

export function CustomerRequestsPage() {
  return (
    <ComingSoonPage
      description="Review and fulfill customer-submitted design requests."
      message="Customer request intake, review, and approval workflows will be added in a future phase."
      title="Customer Requests"
    >
      <MessageSquare aria-hidden="true" className="coming-soon-icon" size={48} strokeWidth={1.5} />
    </ComingSoonPage>
  );
}
