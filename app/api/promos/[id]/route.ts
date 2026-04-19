import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import { z } from 'zod'

const PromoItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  cantidad: z.number().int().min(1),
})

const PromoUpdateSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  descripcion: z.string().max(500).nullable().optional(),
  emoji: z.string().min(1).max(8).optional(),
  pct_descuento: z.number().min(0.1).max(100).optional(),
  activo: z.boolean().optional(),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin: z.string().nullable().optional(),
  items: z.array(PromoItemSchema).min(2).optional(),
})

// PUT — actualizar promo completa (reemplaza items si se envían)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole()
    if (role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const { id } = await params
    const body: unknown = await request.json()
    const parsed = PromoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { items, ...promoData } = parsed.data
    const supabase = await createClient()

    const { data: promo, error: promoErr } = await supabase
      .from('promos')
      .update({
        ...promoData,
        fecha_inicio: promoData.fecha_inicio ?? undefined,
        fecha_fin: promoData.fecha_fin ?? undefined,
      })
      .eq('id', id)
      .select()
      .single()

    if (promoErr || !promo) {
      return NextResponse.json({ data: null, error: promoErr?.message ?? 'No encontrado' }, { status: 404 })
    }

    // Si se envían items, reemplazar todos
    if (items) {
      await supabase.from('promo_items').delete().eq('promo_id', id)
      const itemRows = items.map((item) => ({
        promo_id: id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        cantidad: item.cantidad,
      }))
      await supabase.from('promo_items').insert(itemRows)
    }

    return NextResponse.json({ data: promo, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole()
    if (role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase.from('promos').delete().eq('id', id)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data: { id }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
