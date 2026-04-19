import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole, getUser } from '@/lib/auth'
import { StockMovementSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const role = await getRole()
    if (role !== 'admin' && role !== 'empleado') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = StockMovementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { product_id, variant_id, cantidad, motivo } = parsed.data
    const user = await getUser()
    const supabase = await createClient()

    if (variant_id) {
      // Update variant stock
      const { data: variant, error: fetchErr } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', variant_id)
        .single()

      if (fetchErr || !variant) {
        return NextResponse.json({ data: null, error: 'Variante no encontrada' }, { status: 404 })
      }

      const stockAnterior = variant.stock as number
      const stockNuevo = Math.max(0, stockAnterior + cantidad)

      const { error: updateErr } = await supabase
        .from('product_variants')
        .update({ stock: stockNuevo })
        .eq('id', variant_id)

      if (updateErr) return NextResponse.json({ data: null, error: updateErr.message }, { status: 500 })

      // Register movement
      const { data: movement, error: movErr } = await supabase
        .from('stock_movements')
        .insert({
          product_id,
          variant_id,
          tipo: cantidad > 0 ? 'entrada' : cantidad < 0 ? 'salida' : 'ajuste',
          cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          motivo,
          empleado_id: user?.id ?? null,
        })
        .select()
        .single()

      if (movErr) return NextResponse.json({ data: null, error: movErr.message }, { status: 500 })
      return NextResponse.json({ data: movement, error: null })
    } else {
      // Update product stock
      const { data: product, error: fetchErr } = await supabase
        .from('products')
        .select('stock')
        .eq('id', product_id)
        .single()

      if (fetchErr || !product) {
        return NextResponse.json({ data: null, error: 'Producto no encontrado' }, { status: 404 })
      }

      const stockAnterior = product.stock as number
      const stockNuevo = Math.max(0, stockAnterior + cantidad)

      const { error: updateErr } = await supabase
        .from('products')
        .update({ stock: stockNuevo, updated_at: new Date().toISOString() })
        .eq('id', product_id)

      if (updateErr) return NextResponse.json({ data: null, error: updateErr.message }, { status: 500 })

      const { data: movement, error: movErr } = await supabase
        .from('stock_movements')
        .insert({
          product_id,
          variant_id: null,
          tipo: cantidad > 0 ? 'entrada' : cantidad < 0 ? 'salida' : 'ajuste',
          cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          motivo,
          empleado_id: user?.id ?? null,
        })
        .select()
        .single()

      if (movErr) return NextResponse.json({ data: null, error: movErr.message }, { status: 500 })
      return NextResponse.json({ data: movement, error: null })
    }
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
