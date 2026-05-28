import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { RegistroSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = RegistroSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Datos inválidos'
      return NextResponse.json({ data: null, error: firstError }, { status: 400 })
    }

    const { email, password, nombre, apellido, dni } = parsed.data
    const supabase = await createClient()

    // Verificar DNI duplicado
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('dni', dni)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ data: null, error: 'El DNI ya está registrado' }, { status: 409 })
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido, dni, role: 'cliente' },
      },
    })

    if (error || !data.user) {
      return NextResponse.json({ data: null, error: error?.message ?? 'Error al crear cuenta' }, { status: 400 })
    }

    // Upsert perfil con service role (el trigger ya lo crea, esto cubre el caso de fallo del trigger)
    const serviceClient = await createServiceClient()
    await serviceClient.from('profiles').upsert({
      id: data.user.id,
      role: 'cliente',
      nombre,
      apellido,
      dni,
    }, { onConflict: 'id', ignoreDuplicates: false })

    return NextResponse.json({ data: { id: data.user.id }, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

// GET — buscar perfil por DNI (para ClientVerify)
export async function GET(request: NextRequest) {
  try {
    const dni = request.nextUrl.searchParams.get('dni')
    if (!dni) return NextResponse.json({ data: null, error: 'DNI requerido' }, { status: 400 })

    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
