import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import { ProductFormSchema } from '@/lib/validations'

async function requireAdmin() {
  const role = await getRole()
  return role === 'admin'
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
  }
  try {
    const { id } = await params
    const body: unknown = await request.json()
    const parsed = ProductFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { variants, ...rawProductData } = parsed.data
    // Normalize: empty date strings must be null (Postgres rejects "")
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
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })

    // Upsert variants
    if (variants && variants.length > 0) {
      for (const v of variants) {
        if (v.id) {
          // Update existing variant — do NOT touch stock (handled by /api/products/stock)
          const { error: vErr } = await supabase
            .from('product_variants')
            .update({
              nombre: v.nombre,
              presentacion: v.presentacion ?? null,
              capacidad: v.capacidad ?? null,
              capacidad_unidad: v.capacidad_unidad ?? null,
              precio_variante: v.precio_variante ?? null,
              costo_variante: v.costo_variante ?? null,
              fecha_vencimiento: v.fecha_vencimiento ?? null,
              stock_minimo: v.stock_minimo,
              barcode: v.barcode || null,
              activo: v.activo,
            })
            .eq('id', v.id)
          if (vErr) return NextResponse.json({ data: null, error: vErr.message }, { status: 500 })
        } else {
          // Create new variant with initial stock
          const { error: vErr } = await supabase.from('product_variants').insert({
            product_id: id,
            nombre: v.nombre,
            presentacion: v.presentacion ?? null,
            capacidad: v.capacidad ?? null,
            capacidad_unidad: v.capacidad_unidad ?? null,
            precio_variante: v.precio_variante ?? null,
            costo_variante: v.costo_variante ?? null,
            fecha_vencimiento: v.fecha_vencimiento ?? null,
            stock: v.cantidad_agregar,
            stock_minimo: v.stock_minimo,
            barcode: v.barcode ?? null,
            activo: v.activo,
            precio_extra: 0,
          })
          if (vErr) return NextResponse.json({ data: null, error: vErr.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ data: product, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
  }
  try {
    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase.from('products').update({ activo: false }).eq('id', id)
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: null, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
