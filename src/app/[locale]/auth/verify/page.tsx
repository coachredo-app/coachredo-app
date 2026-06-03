import VerifyForm from './VerifyForm'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ email?: string; next?: string }>
}

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { email = '', next = `/${locale}/dashboard` } = await searchParams
  return <VerifyForm email={email} next={next} locale={locale} />
}
