import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'
import type { Role } from '@/types/index'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const isProtected =
    pathname.startsWith('/empleados') || pathname.startsWith('/admin')

  // Rutas públicas: no consultar DB
  if (!isProtected) return supabaseResponse

  // Login pages are accessible without auth
  if (pathname === '/empleados/login' || pathname === '/admin/login') {
    return supabaseResponse
  }

  // Sin sesión → redirigir al login correcto por sección
  if (!user) {
    if (pathname.startsWith('/empleados')) {
      return NextResponse.redirect(new URL('/empleados/login', request.url))
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Usar service role para bypassear RLS y leer el rol real desde profiles
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? user.user_metadata?.role) as Role | undefined

  if (pathname.startsWith('/empleados')) {
    if (role !== 'empleado' && role !== 'admin') {
      return NextResponse.redirect(new URL('/empleados/login', request.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
