import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import { ProductFormSchema } from '@/lib/validations'

// GET — público
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl

    let query = supabase
      .from('products')
      .select('*, categories(*), product_variants(*)')

    const barcode = searchParams.get('barcode')
    const activo = searchParams.get('activo')

    if (barcode) query = query.eq('barcode', barcode)
    if (activo === 'true') query = query.eq('activo', true)

    const { data, error } = await query.order('nombre')

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

// POST — solo admin
export async function POST(request: NextRequest) {
  try {
    const role = await getRole()
    if (role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const parsed = ProductFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { variants, ...rawProductData } = parsed.data
    // Normalize: empty date strings must be null, not "" (Postgres rejects "")
    const productData = {
      ...rawProductData,
      fecha_vencimiento: rawProductData.fecha_vencimiento || null,
      fecha_inicio_compra: rawProductData.fecha_inicio_compra || null,
      marca: rawProductData.marca || null,
      barcode: rawProductData.barcode || null,
      imagen_url: rawProductData.imagen_url || null,
    }
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    // Create variants with initial stock
    if (variants && variants.length > 0) {
      const variantRows = variants.map((v) => ({
        product_id: product.id,
        nombre: v.nombre,
        presentacion: v.presentacion ?? null,
        capacidad: v.capacidad ?? null,
        capacidad_unidad: v.capacidad_unidad ?? null,
        precio_variante: v.precio_variante ?? null,
        costo_variante: v.costo_variante ?? null,
        fecha_vencimiento: v.fecha_vencimiento ?? null,
        stock: v.cantidad_agregar,
        stock_minimo: v.stock_minimo,
        barcode: v.barcode || null,
        activo: v.activo,
        precio_extra: 0,
      }))
      await supabase.from('product_variants').insert(variantRows)
    }

    return NextResponse.json({ data: product, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
