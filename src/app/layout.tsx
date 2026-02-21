import type { Metadata } from 'next'

import { AppShell } from '@/components/app-shell'
import { ThemeProvider } from '@/components/theme-provider'
import { I18nProvider } from '@/lib/i18n'

import './globals.css'

export const metadata: Metadata = {
  title: 'Chrome Extension Scout',
  description: 'Chrome Web Store intelligence cockpit',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
          storageKey="chrome-ext-scout:theme"
        >
          <I18nProvider>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
