import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LoginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Datos inválidos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error || !data.user) {
      return NextResponse.json({ data: null, error: 'Email o contraseña incorrectos' }, { status: 401 })
    }

    // Always read role from profiles table in DB — never from JWT user_metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({ data: { role: profile?.role ?? 'cliente' }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return NextResponse.json({ data: null, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
