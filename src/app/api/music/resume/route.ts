// POST /api/music/resume — résumé (brief) privé Music V0 (LOT 3, D-058).
// Actions : charger | corriger | valider. Jeton reçu dans le CORPS
// uniquement (jamais dans l'URL), jamais journalisé. Même origine
// uniquement : origines fixes ORIGINES_RESUME, aucun en-tête CORS.
// Limitation de débit : règle du pare-feu Vercel sur ce chemin (hors code).

import { NextResponse } from 'next/server'
import { ORIGINES_RESUME, traiterBrief } from '@/lib/music/briefApi'
import { chargerBrief, corrigerBrief, validerBrief } from '@/lib/music/server/brief'

export const dynamic = 'force-dynamic'

const EN_TETES = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
}

export async function POST(request: Request) {
  let corps = ''
  try {
    corps = await request.text()
  } catch {
    corps = ''
  }
  const r = await traiterBrief(
    {
      methode: request.method,
      origine: request.headers.get('origin'),
      typeContenu: request.headers.get('content-type'),
      corps,
    },
    {
      // Liste fixe (https://coachredo.app, https://www.coachredo.app) — jamais dérivée de la requête.
      originesAutorisees: ORIGINES_RESUME,
      charger: chargerBrief,
      corriger: corrigerBrief,
      valider: validerBrief,
      // Codes techniques uniquement — jamais de jeton ni de contenu.
      journaliser: (code) => console.warn(code),
    }
  )
  return NextResponse.json(r.corps, { status: r.statut, headers: EN_TETES })
}
