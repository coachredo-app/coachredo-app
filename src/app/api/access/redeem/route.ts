import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code manquant.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('redeem_book_code', { p_code: code })

  if (error) {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  const result = data as { success?: boolean; error?: string } | null

  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
