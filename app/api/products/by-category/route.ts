import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'

export async function GET() {
  try {
    const role = await getRole()
    if (!role || (role !== 'empleado' && role !== 'admin')) {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, nombre, emoji, marca, precio, stock, stock_minimo, activo, unidad,
        fecha_vencimiento, costo_unitario,
        categories(id, nombre, emoji),
        product_variants(
          id, nombre, presentacion, capacidad, capacidad_unidad,
          descripcion_completa, precio_variante, precio_extra,
          costo_variante, stock, stock_minimo, fecha_vencimiento, barcode, activo
        )
      `)
      .eq('activo', true)
      .order('nombre')

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    // Group by category
    const grouped: Record<string, {
      id: string
      nombre: string
      emoji: string | null
      productos: typeof products
    }> = {}

    for (const p of products ?? []) {
      const cat = p.categories as unknown as { id: string; nombre: string; emoji: string | null } | null
      const catId = cat?.id ?? '__sin_categoria__'
      const catNombre = cat?.nombre ?? 'Sin categoría'
      const catEmoji = cat?.emoji ?? null

      if (!grouped[catId]) {
        grouped[catId] = { id: catId, nombre: catNombre, emoji: catEmoji, productos: [] }
      }
      grouped[catId].productos.push(p)
    }

    const result = Object.values(grouped).sort((a, b) => a.nombre.localeCompare(b.nombre))

    return NextResponse.json({ data: result, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
