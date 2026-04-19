import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole, getUser } from '@/lib/auth'
import { SaleSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const role = await getRole()
    if (!role || (role !== 'empleado' && role !== 'admin')) {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const supabase = await createClient()
    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const empleadoId = searchParams.get('empleado_id')
    const metodoPago = searchParams.get('metodo_pago')

    let query = supabase
      .from('sales')
      .select('*, profiles!sales_empleado_id_fkey(nombre, apellido), sale_items(*, products(nombre, emoji), product_variants(nombre))')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (empleadoId) query = query.eq('empleado_id', empleadoId)
    if (metodoPago) query = query.eq('metodo_pago', metodoPago)

    const { data, error } = await query
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

    // Get empleado_id from JWT — never trust the client
    const user = await getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Sin sesión' }, { status: 401 })

    const body: unknown = await request.json()
    const parsed = SaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { items, ...saleDataRaw } = parsed.data
    // Override empleado_id with the authenticated user's ID (never from client)
    const saleData = { ...saleDataRaw, empleado_id: user.id }

    const supabase = await createClient()

    // Crear venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert(saleData)
      .select()
      .single()

    if (saleError || !sale) {
      return NextResponse.json({ data: null, error: saleError?.message ?? 'Error al crear venta' }, { status: 500 })
    }

    // Insertar sale_items
    const { error: itemsError } = await supabase.from('sale_items').insert(
      items.map((item) => ({ ...item, sale_id: sale.id }))
    )

    if (itemsError) {
      return NextResponse.json({ data: null, error: itemsError.message }, { status: 500 })
    }

    // Descontar stock por cada item
    for (const item of items) {
      if (item.variant_id) {
        await supabase.rpc('decrement_variant_stock', {
          p_variant_id: item.variant_id,
          p_cantidad: item.cantidad,
        })
      } else {
        await supabase.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_cantidad: item.cantidad,
        })
      }
    }

    return NextResponse.json({ data: sale, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
