import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Serif_Display, Lora } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
})

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'CoachRedo — Construis ton indépendance économique',
  description:
    'Accède au Plan B Rentable : livre, bilan de clarté, programme 90 jours.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://coachredo.app'
  ),
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/**
 * Root layout minimal — ne rend pas <html>/<body> car les layouts enfants
 * ([locale]/layout.tsx) le font en gérant le lang dynamiquement.
 *
 * Les variables de font sont injectées via className sur le fragment,
 * puis récupérées dans [locale]/layout.tsx via les variables CSS.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${jakarta.variable} ${dmSerif.variable} ${lora.variable}`}
    >
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  )
}
