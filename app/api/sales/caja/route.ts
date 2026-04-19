import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import { CashSessionSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const role = await getRole()
    if (!role || (role !== 'empleado' && role !== 'admin')) {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const supabase = await createClient()
    const { searchParams } = request.nextUrl
    const empleadoId = searchParams.get('empleado_id')
    const abierta = searchParams.get('abierta') === 'true'

    const all = searchParams.get('all') === 'true'
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    let query = supabase
      .from('cash_sessions')
      .select('*, profiles!cash_sessions_empleado_id_fkey(nombre, apellido)')
      .order('apertura', { ascending: false })

    if (empleadoId) query = query.eq('empleado_id', empleadoId)
    if (abierta) query = query.is('cierre', null)
    if (desde) query = query.gte('apertura', desde)
    if (hasta) query = query.lte('apertura', hasta + 'T23:59:59')

    let data, error
    if (all) {
      const result = await query.limit(200)
      data = result.data; error = result.error
      if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
      return NextResponse.json({ data, error: null })
    } else {
      const result = await query.limit(1).maybeSingle()
      data = result.data; error = result.error
    }

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = await getRole()
    if (!role || (role !== 'empleado' && role !== 'admin')) {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = CashSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: 'Datos inválidos' }, { status: 400 })
    }

    const supabase = await createClient()
    const empleadoId = (body as Record<string, unknown>).empleado_id as string | undefined

    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({
        empleado_id: empleadoId,
        monto_apertura: parsed.data.monto_apertura,
        notas: parsed.data.notas,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
