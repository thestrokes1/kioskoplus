import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'

export async function GET() {
  try {
    const role = await getRole()
    if (role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const supabase = await createClient()

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const [profilesResult, salesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nombre, apellido, dni, role, created_at')
        .in('role', ['empleado', 'admin'])
        .order('created_at', { ascending: false }),
      supabase
        .from('sales')
        .select('empleado_id, total, created_at')
        .gte('created_at', hoy.toISOString())
        .eq('estado', 'completada'),
    ])

    if (profilesResult.error) {
      return NextResponse.json({ data: null, error: profilesResult.error.message }, { status: 500 })
    }

    const salesByEmp: Record<string, { ventas: number; monto: number; ultima: string | null }> = {}
    for (const s of salesResult.data ?? []) {
      if (!s.empleado_id) continue
      if (!salesByEmp[s.empleado_id]) salesByEmp[s.empleado_id] = { ventas: 0, monto: 0, ultima: null }
      salesByEmp[s.empleado_id].ventas++
      salesByEmp[s.empleado_id].monto += s.total
      if (!salesByEmp[s.empleado_id].ultima || s.created_at > (salesByEmp[s.empleado_id].ultima ?? '')) {
        salesByEmp[s.empleado_id].ultima = s.created_at
      }
    }

    const data = (profilesResult.data ?? []).map((e) => ({
      ...e,
      ventas_hoy: salesByEmp[e.id]?.ventas ?? 0,
      monto_hoy: salesByEmp[e.id]?.monto ?? 0,
      ultima_venta: salesByEmp[e.id]?.ultima ?? null,
    }))

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
