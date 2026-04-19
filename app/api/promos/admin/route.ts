import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'

// GET admin — retorna TODAS las promos (activas e inactivas) con items
export async function GET() {
  try {
    const role = await getRole()
    if (role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('promos')
      .select(`
        *,
        promo_items (
          *,
          products ( id, nombre, emoji, precio, stock, activo ),
          product_variants ( id, nombre, precio_variante, stock )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
