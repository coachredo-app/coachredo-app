import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts')

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
]

const musicHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag',    value: 'noindex, nofollow' },
]

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // Music V0 (D-058) : pages et API du questionnaire privé — jamais de
      // Referer sortant, jamais indexées. Déclarée après la règle générale
      // pour la remplacer sur ces chemins.
      { source: '/:locale(fr|en)/music/:path*', headers: musicHeaders },
      { source: '/api/music/:path*', headers: musicHeaders },
    ]
  },
}

export default withNextIntl(nextConfig)
