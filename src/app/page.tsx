import { redirect } from 'next/navigation'

/**
 * Root page — redirige vers la locale par défaut.
 * Le middleware next-intl gère normalement cela,
 * mais cette page sert de fallback.
 */
export default function RootPage() {
  redirect('/fr')
}
