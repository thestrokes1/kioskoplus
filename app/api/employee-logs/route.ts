import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { z } from 'zod'

const LogSchema = z.object({
  tipo: z.enum(['entrada', 'salida', 'comentario', 'incidente']),
  nota: z.string().min(1, 'La nota es requerida'),
  sale_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  empleado_id: z.string().uuid().optional(), // admin can log for another employee
})

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const empleado_id = searchParams.get('empleado_id')
    const tipo = searchParams.get('tipo')
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '50'), 100)

    const supabase = await createServiceClient()

    let query = supabase
      .from('employee_logs')
      .select(
        '*, empleado:profiles!employee_logs_empleado_id_fkey(nombre, apellido), autor:profiles!employee_logs_registrado_por_fkey(nombre, apellido), sales(id, total), products(nombre, emoji)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (empleado_id) query = query.eq('empleado_id', empleado_id)
    if (tipo) query = query.eq('tipo', tipo)
    if (desde) query = query.gte('created_at', desde)
    if (hasta) query = query.lte('created_at', hasta)

    const { data, error, count } = await query

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, count, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })

    const body: unknown = await request.json()
    const parsed = LogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('employee_logs')
      .insert({
        empleado_id: parsed.data.empleado_id ?? user.id,
        tipo: parsed.data.tipo,
        nota: parsed.data.nota,
        sale_id: parsed.data.sale_id ?? null,
        product_id: parsed.data.product_id ?? null,
        registrado_por: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
