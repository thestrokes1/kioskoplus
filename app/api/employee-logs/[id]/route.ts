import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { z } from 'zod'

const PatchSchema = z.object({
  tipo: z.enum(['entrada', 'salida', 'comentario', 'incidente']).optional(),
  nota: z.string().min(1).optional(),
})

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })

    const supabase = await createServiceClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    const { id } = await params

    // Fetch the log to check ownership
    const { data: log } = await supabase
      .from('employee_logs')
      .select('registrado_por')
      .eq('id', id)
      .single()

    if (!log) {
      return NextResponse.json({ data: null, error: 'Registro no encontrado' }, { status: 404 })
    }

    // Employees can only delete logs they created themselves
    if (!isAdmin && log.registrado_por !== user.id) {
      return NextResponse.json({ data: null, error: 'Solo podés eliminar tus propios registros' }, { status: 403 })
    }

    const { error } = await supabase.from('employee_logs').delete().eq('id', id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })

    const supabase = await createServiceClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    const { id } = await params

    // Fetch the log to check ownership
    const { data: log } = await supabase
      .from('employee_logs')
      .select('registrado_por')
      .eq('id', id)
      .single()

    if (!log) {
      return NextResponse.json({ data: null, error: 'Registro no encontrado' }, { status: 404 })
    }

    // Employees can only edit logs they created themselves
    if (!isAdmin && log.registrado_por !== user.id) {
      return NextResponse.json({ data: null, error: 'Solo podés editar tus propios registros' }, { status: 403 })
    }

    const body: unknown = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('employee_logs')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
