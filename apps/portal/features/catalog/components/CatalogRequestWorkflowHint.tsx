'use client';

import { ChevronDown } from 'lucide-react';

export function CatalogRequestWorkflowHint() {
  return (
    <details className="portal-catalog-request-workflow-hint">
      <summary className="portal-catalog-request-workflow-hint-summary">
        <span className="portal-catalog-request-workflow-hint-title">How print requests work</span>
        <ChevronDown
          aria-hidden
          className="portal-catalog-request-workflow-hint-chevron"
          size={18}
          strokeWidth={2}
        />
      </summary>
      <div className="portal-catalog-request-workflow-hint-content">
        <p className="portal-catalog-request-workflow-hint-body">
          A print request is your list of designs for Fresh Prints to print. You can include designs
          from the Design Library, artwork you upload yourself, or both.
        </p>
        <ol className="portal-catalog-request-workflow-hint-steps">
          <li>Start a new request, or continue one that is still open.</li>
          <li>
            Add library designs and/or upload your own artwork, then set quantities and print sizes.
          </li>
          <li>When you are ready, choose a show so Fresh Prints can print your request.</li>
        </ol>
      </div>
    </details>
  );
}
