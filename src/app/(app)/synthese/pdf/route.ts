import { NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    const pdfPath = join(process.cwd(), 'private', 'plan-b-carte.pdf')
    const pdf = await readFile(pdfPath)

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="plan-b-carte.pdf"',
        'Content-Length': pdf.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('PDF non disponible', { status: 404 })
  }
}
