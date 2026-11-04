import { redirect } from 'next/navigation'

// Stub de redirection — ancienne route, déplacée vers /admin/app/users/[id]
// (migration de l'administration APP vers /admin/app, GO QG étape 1).
// Préserve les anciens liens/signets sans dupliquer la logique.
interface AdminUserFicheStubProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminUserFicheStub({ params }: AdminUserFicheStubProps) {
  const { locale, id } = await params
  redirect(`/${locale}/admin/app/users/${id}`)
}
