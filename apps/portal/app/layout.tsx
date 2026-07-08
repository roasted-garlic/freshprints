import type { Metadata } from 'next'

import { portalThemeInitScript } from '../features/theme/themeInitScript'
import { PORTAL_APP_NAME } from '../features/brand/portalBrand'
import { Providers } from './providers'
import './globals.css'
import '../styles/catalog.css'
import '../styles/requests.css'
import '../styles/shell.css'

export const metadata: Metadata = {
  title: PORTAL_APP_NAME,
  description: 'Customer print requests and design library',
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
