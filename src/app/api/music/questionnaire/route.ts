// POST /api/music/questionnaire — questionnaire privé Music V0 (LOT 2, D-058).
// Actions : charger | brouillon | envoyer. Le jeton est reçu dans le CORPS
// (jamais dans l'URL) et n'est jamais journalisé. Même origine uniquement
// (la page /fr/music/questionnaire est servie par l'app) : origines fixes
// ORIGINES_QUESTIONNAIRE, aucun en-tête CORS.
// Limitation de débit : règle du pare-feu Vercel sur ce chemin (hors code).

import { NextResponse } from 'next/server'
import { ORIGINES_QUESTIONNAIRE, traiterQuestionnaire } from '@/lib/music/questionnaireApi'
import { chargerQuestionnaire, enregistrerBrouillon, envoyerQuestionnaire } from '@/lib/music/server/questionnaire'

export const dynamic = 'force-dynamic'

const EN_TETES = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
}

async function repondre(request: Request, corps: string) {
  const r = await traiterQuestionnaire(
    {
      methode: request.method,
      origine: request.headers.get('origin'),
      typeContenu: request.headers.get('content-type'),
      corps,
    },
    {
      // Liste fixe (https://coachredo.app, https://www.coachredo.app) — jamais dérivée de la requête.
      originesAutorisees: ORIGINES_QUESTIONNAIRE,
      charger: chargerQuestionnaire,
      brouillon: enregistrerBrouillon,
      envoyer: envoyerQuestionnaire,
      // Codes techniques uniquement — jamais de jeton ni de réponse.
      journaliser: (code) => console.warn(code),
    }
  )
  return NextResponse.json(r.corps, { status: r.statut, headers: EN_TETES })
}

export async function POST(request: Request) {
  let corps = ''
  try {
    corps = await request.text()
  } catch {
    corps = ''
  }
  return repondre(request, corps)
}
