import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import { z } from 'zod'

const EmployeeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['empleado', 'admin']),
})

export async function POST(request: NextRequest) {
  try {
    const adminRole = await getRole()
    if (adminRole !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = EmployeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { nombre, apellido, email, password, role } = parsed.data
    const supabase = await createServiceClient()

    // Create the auth user (confirmed so no email verification needed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ data: null, error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // Upsert the profile with the correct role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, nombre, apellido, role })

    if (profileError) {
      // Clean up auth user if profile save fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ data: null, error: profileError.message }, { status: 500 })
    }

    return NextResponse.json(
      { data: { id: userId, email, nombre, apellido, role }, error: null },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
