// /fr/music/resume — résumé (brief) privé CoachRedo Music V0 (LOT 3, D-058).
// Page publique (aucun compte) : accès par le lien privé de la commande,
// jeton lu côté navigateur dans le fragment #t= (jamais envoyé
// automatiquement au serveur) puis transmis dans le corps des requêtes API.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Instrument_Serif } from 'next/font/google'
import ResumeMusic from './ResumeMusic'
import styles from '../questionnaire/questionnaire.module.css'

const serif = Instrument_Serif({
  variable: '--font-music-serif',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Vérifiez votre histoire — CoachRedo Music',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'fr') notFound()
  return (
    <div className={`${serif.variable} ${styles.fond}`}>
      <ResumeMusic />
    </div>
  )
}
