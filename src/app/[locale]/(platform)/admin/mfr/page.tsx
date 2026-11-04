import { redirect } from 'next/navigation'

// Stub de redirection — ancienne route, déplacée vers /admin/app/mfr
// (migration de l'administration APP vers /admin/app, étape 2).
// Préserve les anciens liens/signets sans dupliquer la logique.
interface AdminMfrStubProps {
  params: Promise<{ locale: string }>
}

export default async function AdminMfrStub({ params }: AdminMfrStubProps) {
  const { locale } = await params
  redirect(`/${locale}/admin/app/mfr`)
}
