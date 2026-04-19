import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole()
    if (!role || (role !== 'empleado' && role !== 'admin')) {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const { id } = await params
    const body = (await request.json()) as { notas?: string; monto_cierre?: number }
    const supabase = await createClient()

    // Calcular totales de ventas en esta sesión
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('apertura, empleado_id')
      .eq('id', id)
      .single()

    if (!session) {
      return NextResponse.json({ data: null, error: 'Sesión no encontrada' }, { status: 404 })
    }

    const { data: sales } = await supabase
      .from('sales')
      .select('total, metodo_pago')
      .eq('empleado_id', session.empleado_id)
      .eq('estado', 'completada')
      .gte('created_at', session.apertura)

    const totalEfectivo = (sales ?? [])
      .filter((s) => s.metodo_pago === 'efectivo')
      .reduce((a, s) => a + s.total, 0)

    const totalMp = (sales ?? [])
      .filter((s) => s.metodo_pago === 'mercadopago')
      .reduce((a, s) => a + s.total, 0)

    const { data, error } = await supabase
      .from('cash_sessions')
      .update({
        cierre: new Date().toISOString(),
        estado: 'cerrada',
        total_efectivo: totalEfectivo,
        total_mp: totalMp,
        total_ventas: (sales ?? []).length,
        notas: body.notas ?? null,
        monto_cierre: body.monto_cierre ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
