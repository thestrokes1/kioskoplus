import Link from 'next/link'
import { AlertTriangle, CalendarX } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'

interface ExpiryRow {
  id: string
  nombre: string
  fecha_vencimiento: string
  stock: number
  stock_minimo: number
  tipo: 'producto' | 'variante'
  producto_nombre?: string
  producto_emoji?: string
}

function diasRestantes(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fecha + 'T00:00:00')
  return Math.floor((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export async function ExpiryAlerts() {
  const supabase = await createServiceClient()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const en7 = new Date(hoy)
  en7.setDate(hoy.getDate() + 7)

  // Products with expiry (product-level)
  const { data: rawProducts } = await supabase
    .from('products')
    .select('id, nombre, emoji, fecha_vencimiento, stock, stock_minimo')
    .eq('activo', true)
    .not('fecha_vencimiento', 'is', null)
    .lte('fecha_vencimiento', en7.toISOString().slice(0, 10))
    .order('fecha_vencimiento')

  // Variants with expiry
  const { data: rawVariants } = await supabase
    .from('product_variants')
    .select('id, nombre, fecha_vencimiento, stock, stock_minimo, products(nombre, emoji)')
    .eq('activo', true)
    .not('fecha_vencimiento', 'is', null)
    .lte('fecha_vencimiento', en7.toISOString().slice(0, 10))
    .order('fecha_vencimiento')

  type ProductRow = { id: string; nombre: string; emoji: string; fecha_vencimiento: string; stock: number; stock_minimo: number }
  type VariantRow = { id: string; nombre: string; fecha_vencimiento: string; stock: number; stock_minimo: number; products: { nombre: string; emoji: string } | { nombre: string; emoji: string }[] | null }

  const alerts: ExpiryRow[] = [
    ...((rawProducts ?? []) as ProductRow[]).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      fecha_vencimiento: p.fecha_vencimiento,
      stock: p.stock,
      stock_minimo: p.stock_minimo,
      tipo: 'producto' as const,
      producto_emoji: p.emoji,
    })),
    ...((rawVariants ?? []) as VariantRow[]).map((v) => {
      const prod = Array.isArray(v.products) ? v.products[0] : v.products
      return {
        id: v.id,
        nombre: v.nombre,
        fecha_vencimiento: v.fecha_vencimiento,
        stock: v.stock,
        stock_minimo: v.stock_minimo,
        tipo: 'variante' as const,
        producto_nombre: prod?.nombre ?? '',
        producto_emoji: prod?.emoji ?? '📦',
      }
    }),
  ].sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))

  const vencidos = alerts.filter((a) => diasRestantes(a.fecha_vencimiento) < 0)
  const proximos = alerts.filter((a) => {
    const d = diasRestantes(a.fecha_vencimiento)
    return d >= 0 && d <= 7
  })

  if (alerts.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Alertas de vencimiento
          </h2>
          <span className="rounded-full bg-amber-200 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
            {alerts.length}
          </span>
        </div>
        <Link
          href="/empleados/inventario?filtro=vencidos"
          className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
        >
          Ver inventario →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {vencidos.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
              <CalendarX className="h-3 w-3" /> Vencidos — retirar del stock
            </p>
            {vencidos.slice(0, 5).map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        )}

        {proximos.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {vencidos.length > 0 && <div className="my-1 border-t border-amber-200 dark:border-amber-900/50" />}
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Vencen en los próximos 7 días</p>
            {proximos.slice(0, 8).map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: ExpiryRow }) {
  const dias = diasRestantes(alert.fecha_vencimiento)
  const vencido = dias < 0
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${vencido ? 'bg-red-100 dark:bg-red-950/30' : 'bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/30'}`}>
      <div className="flex items-center gap-2">
        <span>{alert.producto_emoji}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {alert.tipo === 'variante' ? `${alert.producto_nombre} — ${alert.nombre}` : alert.nombre}
        </span>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="text-gray-500 dark:text-gray-400">{alert.stock} u.</span>
        <span className={`font-semibold ${vencido ? 'text-red-700' : dias <= 3 ? 'text-amber-700' : 'text-gray-600'}`}>
          {vencido ? `hace ${Math.abs(dias)}d` : dias === 0 ? 'hoy' : `${dias}d`}
        </span>
      </div>
    </div>
  )
}
