import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { z } from 'zod'

const ProfileUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  telefono: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, apellido, dni, telefono, role')
      .eq('id', user.id)
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: { ...data, email: user.email }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })

    const body: unknown = await request.json()
    const parsed = ProfileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        telefono: parsed.data.telefono ?? null,
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
