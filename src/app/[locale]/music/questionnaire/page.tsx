// /fr/music/questionnaire — questionnaire privé CoachRedo Music V0 (LOT 2, D-058).
// Page publique (aucun compte) : l'accès repose uniquement sur le jeton du
// lien privé, lu côté navigateur dans le fragment #t= (jamais envoyé
// automatiquement au serveur) puis transmis dans le corps des requêtes API.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Instrument_Serif } from 'next/font/google'
import QuestionnaireMusic from './QuestionnaireMusic'
import styles from './questionnaire.module.css'

const serif = Instrument_Serif({
  variable: '--font-music-serif',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Votre questionnaire — CoachRedo Music',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'fr') notFound()
  return (
    <div className={`${serif.variable} ${styles.fond}`}>
      <QuestionnaireMusic />
    </div>
  )
}
