import { redirect } from 'next/navigation'

interface TradingPageProps {
  params: Promise<{ locale: string }>
}

export default async function TradingPage({ params }: TradingPageProps) {
  const { locale } = await params
  redirect(`/${locale}/trading/dashboard`)
}
