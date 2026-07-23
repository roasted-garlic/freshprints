import type { Metadata } from 'next'

import { loadPortalGlobalSocialMeta } from '../../../features/brand/portalGlobalSocialMetaService'
import { PortalHelpPageContent } from '../../../features/help/components/PortalHelpPageContent'
import { buildPortalHelpPageMetadata } from '../../../features/help/utils/portalHelpMeta'
import { getPortalMetadataBase } from '../../../features/brand/portalSiteMeta'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta()
  return {
    metadataBase: getPortalMetadataBase(),
    ...buildPortalHelpPageMetadata({
      social: {
        ogTitle: social.ogTitle,
        ogDescription: social.ogDescription,
        ogImageUrl: social.imageUrl,
      },
    }),
  }
}

export default function HelpPage() {
  return <PortalHelpPageContent />
}
