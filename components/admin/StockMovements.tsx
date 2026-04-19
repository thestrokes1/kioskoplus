import { createServiceClient } from '@/lib/supabase/server'
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Trash2 } from 'lucide-react'
import type { StockMovement } from '@/types/index'

type MovRow = StockMovement & {
  products: { nombre: string; emoji: string } | null
  product_variants: { nombre: string } | null
  profiles: { nombre: string | null; apellido: string | null } | null
}

const TIPO_ICON = {
  entrada: <ArrowUpCircle className="h-4 w-4 text-emerald-600" />,
  salida: <ArrowDownCircle className="h-4 w-4 text-red-500" />,
  ajuste: <RefreshCw className="h-4 w-4 text-blue-500" />,
  vencimiento: <Trash2 className="h-4 w-4 text-amber-500" />,
}

const TIPO_COLOR = {
  entrada: 'text-emerald-700 bg-emerald-50',
  salida: 'text-red-700 bg-red-50',
  ajuste: 'text-blue-700 bg-blue-50',
  vencimiento: 'text-amber-700 bg-amber-50',
}

export async function StockMovements() {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('stock_movements')
    .select('*, products(nombre, emoji), product_variants(nombre), profiles(nombre, apellido)')
    .order('created_at', { ascending: false })
    .limit(30)

  const movements = (data ?? []) as MovRow[]

  if (movements.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Movimientos de stock</h2>
        <p className="text-sm text-gray-400">Sin movimientos registrados</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">
        Últimos movimientos de stock
        <span className="ml-2 text-xs font-normal text-gray-400">(últimos 30)</span>
      </h2>

      <div className="flex flex-col gap-2">
        {movements.map((m) => {
          const tipoKey = m.tipo as keyof typeof TIPO_ICON
          const prodName = m.products?.nombre ?? 'Desconocido'
          const variantName = m.product_variants?.nombre ? ` — ${m.product_variants.nombre}` : ''
          const empleado = m.profiles
            ? `${m.profiles.nombre ?? ''} ${m.profiles.apellido ?? ''}`.trim()
            : 'Sistema'
          const date = new Date(m.created_at).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-gray-50 bg-gray-50 px-4 py-2.5"
            >
              <div className="shrink-0">{TIPO_ICON[tipoKey] ?? TIPO_ICON.ajuste}</div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {m.products?.emoji} {prodName}{variantName}
                </p>
                <p className="text-xs text-gray-400">
                  {m.motivo ?? '—'} · {empleado} · {date}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIPO_COLOR[tipoKey] ?? TIPO_COLOR.ajuste}`}
                >
                  {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                </span>
                {m.stock_anterior !== null && m.stock_nuevo !== null && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {m.stock_anterior} → {m.stock_nuevo}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
