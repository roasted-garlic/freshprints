import {
  getPortalPrintRequestListTabLabel,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

export type PortalRequestDetailFrom =
  | PortalPrintRequestListTab
  | 'discover'
  | 'library'
  | 'requests';

const REQUEST_DETAIL_FROM_VALUES = new Set<string>([
  'working',
  'editing',
  'queued',
  'printing',
  'printed',
  'discover',
  'library',
  'requests',
]);

export function parsePortalRequestDetailFrom(
  raw: string | null | undefined,
): PortalRequestDetailFrom | null {
  if (!raw?.trim()) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (!REQUEST_DETAIL_FROM_VALUES.has(value)) {
    return null;
  }
  return value as PortalRequestDetailFrom;
}

export function buildRequestDetailHref(
  printRequestId: string,
  options?: { from?: PortalRequestDetailFrom | null; upload?: boolean },
): string {
  const params = new URLSearchParams();
  if (options?.from) {
    params.set('from', options.from);
  }
  if (options?.upload) {
    params.set('upload', '1');
  }
  const query = params.toString();
  return query ? `/requests/${printRequestId}?${query}` : `/requests/${printRequestId}`;
}

export function resolvePortalRequestDetailBack(
  from: PortalRequestDetailFrom | null,
  fallbackTab: PortalPrintRequestListTab,
): { href: string; label: string } {
  if (from === 'discover') {
    return { href: '/', label: 'Back to Home' };
  }
  if (from === 'library') {
    return { href: '/catalog', label: 'Back to Design Library' };
  }
  if (from === 'requests') {
    return { href: '/requests', label: 'Back to Print requests' };
  }

  const tab: PortalPrintRequestListTab =
    from === 'working' ||
    from === 'editing' ||
    from === 'queued' ||
    from === 'printing' ||
    from === 'printed'
      ? from
      : fallbackTab;

  return {
    href: `/requests?tab=${tab}`,
    label: `Back to ${getPortalPrintRequestListTabLabel(tab)}`,
  };
}
