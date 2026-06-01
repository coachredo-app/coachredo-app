import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './lib/i18n/routing'

/** Routes du reader existant (legacy — pas de i18n) */
const READER_ROUTES = ['/resume', '/intro', '/chapter', '/quiz', '/access']
const READER_PUBLIC = ['/login', '/signup', '/access', '/reset-password']
const READER_AUTH = ['/login', '/signup']

/** Segments de la plateforme nécessitant une auth */
const PLATFORM_PROTECTED = ['dashboard', 'plan-b', 'account', 'settings', 'admin']

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Routes reader legacy (/(app), /resume, /intro, /chapter, etc.) ──
  const isReaderRoute = READER_ROUTES.some((r) => pathname.startsWith(r))
  const isAppRoute =
    pathname.startsWith('/resume') ||
    pathname.startsWith('/intro') ||
    pathname.startsWith('/chapter') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/access') ||
    pathname.startsWith('/transition') ||
    pathname.startsWith('/bilan') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/reset-password'

  if (isAppRoute) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Authenticated user on auth pages → redirect to app
    if (user && READER_AUTH.includes(pathname)) {
      return NextResponse.redirect(new URL('/resume', request.url))
    }

    // No session on protected routes → redirect to login
    if (!user && !READER_PUBLIC.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && !READER_AUTH.includes(pathname)) {
      const { data: access } = await supabase
        .from('book_access')
        .select('has_access')
        .eq('user_id', user.id)
        .single()

      if (
        !access?.has_access &&
        pathname !== '/access' &&
        pathname !== '/api/access/redeem'
      ) {
        return NextResponse.redirect(new URL('/access', request.url))
      }

      if (access?.has_access && pathname === '/access') {
        return NextResponse.redirect(new URL('/resume', request.url))
      }

      if (access?.has_access && pathname === '/quiz') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('completion_percentage')
          .eq('id', user.id)
          .single()

        if (!profile || profile.completion_percentage < 100) {
          return NextResponse.redirect(new URL('/chapter/7', request.url))
        }
      }
    }

    return supabaseResponse
  }

  // ── 2. Routes API — passer sans modification ───────────────────────────
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // ── 3. Routes plateforme i18n (/fr/..., /en/...) ──────────────────────
  // Passer par le middleware next-intl
  const intlResponse = intlMiddleware(request)

  // Refresh session Supabase
  let response = intlResponse ?? NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Vérification auth pour les routes plateforme protégées
  // Format : /{locale}/{segment}/...
  const parts = pathname.split('/').filter(Boolean)
  const locale = parts[0]
  const segment = parts[1]

  const isLocale = locale === 'fr' || locale === 'en'
  const isProtected = isLocale && segment && PLATFORM_PROTECTED.includes(segment)

  if (isProtected && !user) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
  ],
}
