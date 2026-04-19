import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ data: null, error: 'No autenticado' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(nombre, emoji), product_variants(nombre))')
      .eq('cliente_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
