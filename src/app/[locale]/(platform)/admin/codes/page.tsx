import { redirect } from 'next/navigation'

// Stub de redirection — ancienne route, déplacée vers /admin/app/codes
// (migration de l'administration APP vers /admin/app, GO QG étape 1).
// Préserve les anciens liens/signets sans dupliquer la logique.
interface AdminCodesStubProps {
  params: Promise<{ locale: string }>
}

export default async function AdminCodesStub({ params }: AdminCodesStubProps) {
  const { locale } = await params
  redirect(`/${locale}/admin/app/codes`)
}
