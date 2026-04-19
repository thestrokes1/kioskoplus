import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import { z } from 'zod'

const PromoItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  cantidad: z.number().int().min(1),
})

const PromoSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).nullable().optional(),
  emoji: z.string().min(1).max(8).default('🎉'),
  pct_descuento: z.number().min(0.1).max(100),
  activo: z.boolean().default(true),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin: z.string().nullable().optional(),
  items: z.array(PromoItemSchema).min(2, 'Una promo necesita al menos 2 productos'),
})

// GET — público: trae promos activas con items + productos + variantes
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('promos')
      .select(`
        *,
        promo_items (
          *,
          products ( id, nombre, emoji, precio, stock, activo, product_variants ( id, nombre, precio_variante, stock, activo ) ),
          product_variants ( id, nombre, precio_variante, stock, activo )
        )
      `)
      .eq('activo', true)
      .order('created_at', { ascending: false })

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
    const parsed = PromoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const { items, ...promoData } = parsed.data
    const supabase = await createClient()

    const { data: promo, error: promoErr } = await supabase
      .from('promos')
      .insert({
        ...promoData,
        fecha_inicio: promoData.fecha_inicio || null,
        fecha_fin: promoData.fecha_fin || null,
        descripcion: promoData.descripcion || null,
      })
      .select()
      .single()

    if (promoErr || !promo) {
      return NextResponse.json({ data: null, error: promoErr?.message ?? 'Error al crear' }, { status: 500 })
    }

    const itemRows = items.map((item) => ({
      promo_id: promo.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      cantidad: item.cantidad,
    }))

    const { error: itemsErr } = await supabase.from('promo_items').insert(itemRows)
    if (itemsErr) {
      await supabase.from('promos').delete().eq('id', promo.id)
      return NextResponse.json({ data: null, error: itemsErr.message }, { status: 500 })
    }

    return NextResponse.json({ data: promo, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
