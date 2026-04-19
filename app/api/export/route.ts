import { NextRequest, NextResponse } from 'next/server'
import { getRole } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((c) => {
      const s = String(c ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    })
    .join(',')
}

function formatAR(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n)
}

export async function GET(request: NextRequest) {
  const role = await getRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Sin autorización' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const tipo = searchParams.get('tipo') ?? 'ventas'
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const supabase = await createServiceClient()

  if (tipo === 'inventario') {
    const { data: products } = await supabase
      .from('products')
      .select('*, categories(*), product_variants(*)')
      .order('nombre')

    const rows: string[] = []
    rows.push(csvRow(['Nombre', 'Marca', 'Categoría', 'Precio', 'Costo', 'Stock', 'Stock mínimo', 'Fecha venc.', 'Activo', 'Variantes']))

    for (const p of products ?? []) {
      const category = (p.categories as { nombre?: string } | null)?.nombre ?? ''
      const variants = (p.product_variants ?? []).length
      rows.push(csvRow([
        p.nombre,
        p.marca ?? '',
        category,
        formatAR(p.precio),
        p.costo_unitario ? formatAR(p.costo_unitario) : '',
        p.stock,
        p.stock_minimo,
        p.fecha_vencimiento ?? '',
        p.activo ? 'Sí' : 'No',
        variants,
      ]))
    }

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventario_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  // tipo === 'ventas'
  let query = supabase
    .from('sales')
    .select('*, profiles!sales_empleado_id_fkey(nombre, apellido), sale_items(*, products(nombre, emoji))')
    .eq('estado', 'completada')
    .order('created_at', { ascending: false })

  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data: sales } = await query

  const rows: string[] = []
  rows.push(csvRow(['Fecha', 'Hora', 'ID', 'Empleado', 'Método pago', 'Items', 'Total']))

  for (const s of sales ?? []) {
    const empleado = s.profiles
      ? `${(s.profiles as { nombre?: string | null }).nombre ?? ''} ${(s.profiles as { apellido?: string | null }).apellido ?? ''}`.trim()
      : ''
    const itemsSummary = (s.sale_items ?? [])
      .map((si: { cantidad: number; precio_unitario: number; products?: { nombre?: string } | null }) =>
        `${si.products ? (si.products as { nombre?: string }).nombre ?? '' : ''} x${si.cantidad} (${formatAR(si.precio_unitario)})`
      )
      .join(' | ')
    const fecha = new Date(s.created_at)
    rows.push(csvRow([
      fecha.toLocaleDateString('es-AR'),
      fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      s.id.slice(0, 8),
      empleado,
      s.metodo_pago,
      itemsSummary,
      formatAR(s.total),
    ]))
  }

  const csv = rows.join('\n')
  const rangeStr = desde && hasta
    ? `_${desde.slice(0, 10)}_${hasta.slice(0, 10)}`
    : `_${new Date().toISOString().slice(0, 10)}`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ventas${rangeStr}.csv"`,
    },
  })
}
