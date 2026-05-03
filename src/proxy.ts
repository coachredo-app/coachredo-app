import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authRoutes = ['/login', '/signup']
  const publicRoutes = ['/login', '/signup', '/access']

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

  const { data: { user } } = await supabase.auth.getUser()

  // Authenticated user on auth pages → redirect to app
  if (user && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/intro', request.url))
  }

  // No session on protected routes → redirect to login
  if (!user && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // All checks below require an authenticated user with book access
  if (user && !authRoutes.includes(pathname)) {
    const { data: access } = await supabase
      .from('book_access')
      .select('has_access')
      .eq('user_id', user.id)
      .single()

    if (!access?.has_access && pathname !== '/access' && pathname !== '/api/access/redeem') {
      return NextResponse.redirect(new URL('/access', request.url))
    }

    // Already has access but visiting /access → redirect to app
    if (access?.has_access && pathname === '/access') {
      return NextResponse.redirect(new URL('/intro', request.url))
    }

    // Quiz gate: all 42 required exercises must be saved in Supabase (completion_percentage = 100).
    // In Phase 3 (localStorage only), completion_percentage stays 0 → quiz is always blocked.
    // In Phase 4 (Supabase sync), the trigger updates this field when exercises are saved.
    if (access?.has_access && pathname === '/quiz') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('completion_percentage')
        .eq('id', user.id)
        .single()

      if (!profile || profile.completion_percentage < 100) {
        return NextResponse.redirect(new URL('/chapter/10', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
