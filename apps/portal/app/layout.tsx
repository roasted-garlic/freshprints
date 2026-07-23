import type { Metadata } from 'next'

import { portalThemeInitScript } from '../features/theme/themeInitScript'
import { buildPortalRootMetadata } from '../features/brand/portalSiteMeta'
import { loadPortalGlobalSocialMeta } from '../features/brand/portalGlobalSocialMetaService'
import { Providers } from './providers'
import './globals.css'
import '../styles/catalog.css'
import '../styles/requests.css'
import '../styles/customer-uploads.css'
import '../styles/etsy-recommendations.css'
import '../styles/assisted-creation.css'
import '../styles/help.css'
import '../styles/shell.css'

/** Refresh global OG settings / hourly library image without force-dynamic on every page. */
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta()
  return buildPortalRootMetadata(process.env, {
    ogTitle: social.ogTitle,
    ogDescription: social.ogDescription,
    ogImageUrl: social.imageUrl,
  })
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: portalThemeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
