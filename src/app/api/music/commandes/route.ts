// POST /api/music/commandes — seul point d'entrée public Music V0 (D-058).
// Création d'une commande depuis la landing https://www.coachredo.com.
// Limitation de débit : règle du pare-feu Vercel sur ce chemin (hors code).

import { NextResponse } from 'next/server'
import { originesAutorisees } from '@/lib/music/cors'
import { traiterCreationCommande, type RequeteCreation } from '@/lib/music/creationCommande'
import { creerCommandeMusic } from '@/lib/music/server/creerCommande'

export const dynamic = 'force-dynamic'

async function repondre(request: Request, corps: string) {
  const req: RequeteCreation = {
    methode: request.method,
    origine: request.headers.get('origin'),
    typeContenu: request.headers.get('content-type'),
    corps,
  }
  const r = await traiterCreationCommande(req, {
    originesAutorisees: originesAutorisees(process.env.MUSIC_CORS_ORIGINS),
    creer: creerCommandeMusic,
    // Codes techniques uniquement — jamais de donnée personnelle.
    journaliser: (code) => console.warn(code),
  })
  const enTetes = { ...r.enTetes, 'Cache-Control': 'no-store' }
  return r.corps === null
    ? new NextResponse(null, { status: r.statut, headers: enTetes })
    : NextResponse.json(r.corps, { status: r.statut, headers: enTetes })
}

export async function OPTIONS(request: Request) {
  return repondre(request, '')
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
