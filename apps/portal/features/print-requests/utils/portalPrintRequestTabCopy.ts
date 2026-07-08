import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

/** Copy for the requests page before any print requests exist (no tabs shown yet). */
export function getPortalPrintRequestsEmptyPageCopy(): string {
  return 'Nothing here yet. Start a request to add designs, add it to a show\'s print run when you are ready, and follow its progress as it moves through each stage.';
}

/** General explanation of what each tab is for — not written as if requests are already present. */
export function getPortalPrintRequestTabGuideCopy(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case 'working':
      return 'The Working tab is for drafts in progress. Requests will appear here while you add designs, set quantities and print sizes, and get them ready to add to a show\'s print run.';
    case 'queued':
      return 'The Queued tab is for requests assigned to an upcoming show\'s print run. After a request is queued to a show\'s print run, it will appear here until printing begins.';
    case 'printing':
      return 'The Printing tab is for requests in an active print run. They will move here from Queued when printing begins and stay here until that run finishes.';
    case 'printed':
      return 'The Printed tab is for completed requests. After production finishes, requests will appear here so you can review what has already been printed.';
  }
}

/** Empty-tab message — describes what will show up here, not what is already here. */
export function getPortalPrintRequestTabEmptyCopy(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case 'working':
      return 'Nothing here yet. When you start a new request, it will appear here while you add designs and prepare it for a show\'s print run.';
    case 'queued':
      return 'Nothing here yet. When you add a request to a show\'s print run, it will appear here until printing begins.';
    case 'printing':
      return 'Nothing here yet. While a request is in an active print run, it will show up here.';
    case 'printed':
      return 'Nothing here yet. After production is complete, finished requests will appear here.';
  }
}
