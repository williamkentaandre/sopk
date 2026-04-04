import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { LocaleProvider } from './LocaleContext'
import { LanguageSwitcher } from './components/LanguageSwitcher'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'Ranking Force - Suivi de positions Google',
  description: 'Outil minimal pour suivre le classement de vos mots-clés dans le temps. Simple, rapide, sans les coûts des suites SEO.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <Providers>
          <LocaleProvider>
            <LanguageSwitcher />
            {children}
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  )
}

