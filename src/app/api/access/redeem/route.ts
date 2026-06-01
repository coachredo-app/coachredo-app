import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  const service = createServiceClient()

  // Check code validity
  const { data: accessCode } = await service
    .from('access_codes')
    .select('code, access_type, used_by')
    .eq('code', code)
    .single()

  if (!accessCode) {
    return NextResponse.json({ error: 'Code invalide ou expiré.' }, { status: 400 })
  }

  if (accessCode.used_by) {
    return NextResponse.json({ error: 'Ce code a déjà été utilisé.' }, { status: 400 })
  }

  // Mark code as used
  await service
    .from('access_codes')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('code', code)

  // Grant access — upsert in case trigger row is missing for legacy users
  await service
    .from('book_access')
    .upsert({
      user_id: user.id,
      has_access: true,
      access_granted_at: new Date().toISOString(),
      access_method: 'code',
    }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true })
}
