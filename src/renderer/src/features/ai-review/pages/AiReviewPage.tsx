import { Sparkles } from "lucide-react";

import { ComingSoonPage } from "../../../shared/pages/ComingSoonPage";

export function AiReviewPage() {
  return (
    <ComingSoonPage
      description="Review AI-generated titles, descriptions, categories, and tags before publishing designs."
      message="AI vision, auto-naming, and enrichment review tools will be added in a future phase."
      title="AI Review"
    >
      <Sparkles aria-hidden="true" className="coming-soon-icon" size={48} strokeWidth={1.5} />
    </ComingSoonPage>
  );
}
