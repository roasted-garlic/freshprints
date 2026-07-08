import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

/** General explanation of what each tab is for — not written as if requests are already present. */
export function getPortalPrintRequestTabGuideCopy(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case 'working':
      return 'The Working tab is for drafts in progress. Requests will appear here while you add designs, set quantities and print sizes, and get them ready to queue to a Whatnot show.';
    case 'queued':
      return 'The Queued tab is for requests assigned to an upcoming show. After you queue a request to a show, it will appear here while waiting for the print run to start.';
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
      return 'Nothing here yet. When you start a new request, it will appear here while you add designs and prepare it for a show.';
    case 'queued':
      return 'Nothing here yet. When you queue a request to an upcoming show, it will appear here while waiting for the print run to start.';
    case 'printing':
      return 'Nothing here yet. While a request is in an active print run, it will show up here.';
    case 'printed':
      return 'Nothing here yet. After production is complete, finished requests will appear here.';
  }
}
