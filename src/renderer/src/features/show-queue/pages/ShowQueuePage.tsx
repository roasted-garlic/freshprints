import { ListOrdered } from "lucide-react";

import { ComingSoonPage } from "../../../shared/pages/ComingSoonPage";

export function ShowQueuePage() {
  return (
    <ComingSoonPage
      description="Build and manage show queues from approved catalog designs."
      message="Queue creation, ordering, and production tracking will be added in a future phase."
      title="Show Queue"
    >
      <ListOrdered aria-hidden="true" className="coming-soon-icon" size={48} strokeWidth={1.5} />
    </ComingSoonPage>
  );
}
