import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { DateRangePicker } from '@/components/admin/DateRangePicker'
import { ExportButton } from '@/components/admin/ExportButton'
import { KPICards } from '@/components/admin/KPICards'
import { SalesChart } from '@/components/admin/SalesChart'
import { ProductRanking } from '@/components/admin/ProductRanking'
import { NoMovementList } from '@/components/admin/NoMovementList'
import { ExpiryAlerts } from '@/components/admin/ExpiryAlerts'
import { PromoAnalytics } from '@/components/admin/PromoAnalytics'
import type {
  AnalyticsKPI,
  PeriodPoint,
  ProductRankingItem,
  NoMovementItem,
  PromoAnalyticsItem,
  DashboardAnalytics,
} from '@/types/index'

export const revalidate = 0

// ─── helpers ────────────────────────────────────────────────────────────────

/** Rango predeterminado: hoy en Argentina (UTC-3) */
function getDefaultRange(): { desde: string; hasta: string } {
  const now = new Date()
  const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const y = arNow.getUTCFullYear()
  const m = arNow.getUTCMonth()
  const d = arNow.getUTCDate()
  // 00:00 AR = 03:00 UTC ; 23:59:59 AR = mañana 02:59:59 UTC
  const desde = new Date(Date.UTC(y, m, d, 3, 0, 0, 0)).toISOString()
  const hasta = new Date(Date.UTC(y, m, d + 1, 2, 59, 59, 999)).toISOString()
  return { desde, hasta }
}

function prevPeriod(desde: Date, hasta: Date) {
  const diffMs = hasta.getTime() - desde.getTime()
  return {
    prevDesde: new Date(desde.getTime() - diffMs),
    prevHasta: new Date(desde.getTime() - 1),
  }
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function fetchDashboard(desde: string, hasta: string): Promise<DashboardAnalytics> {
  const supabase = await createServiceClient()

  const desdeDate = new Date(desde)
  const hastaDate = new Date(hasta)
  const { prevDesde, prevHasta } = prevPeriod(desdeDate, hastaDate)

  type SaleRow = { id: string; total: number; metodo_pago: string; created_at: string; empleado_id: string | null }
  type ItemRow = { sale_id: string; product_id: string; cantidad: number; subtotal: number; promo_label: string | null }
  type PrevItemRow = { sale_id: string; product_id: string; cantidad: number }
  type ProductRow = { id: string; nombre: string; emoji: string; category_id: string | null; stock: number; stock_minimo: number }
  type CategoryRow = { id: string; nombre: string; emoji: string | null }
  type ProfileRow = { id: string; nombre: string | null; apellido: string | null }

  const [
    { data: rawSales },
    { data: rawPrevSales },
    { data: rawProducts },
    { data: rawCategories },
    { data: rawProfiles },
  ] = await Promise.all([
    supabase
      .from('sales')
      .select('id, total, metodo_pago, created_at, empleado_id')
      .eq('estado', 'completada')
      .gte('created_at', desdeDate.toISOString())
      .lte('created_at', hastaDate.toISOString()),
    supabase
      .from('sales')
      .select('id, total')
      .eq('estado', 'completada')
      .gte('created_at', prevDesde.toISOString())
      .lte('created_at', prevHasta.toISOString()),
    supabase
      .from('products')
      .select('id, nombre, emoji, category_id, stock, stock_minimo')
      .eq('activo', true),
    supabase.from('categories').select('id, nombre, emoji'),
    supabase.from('profiles').select('id, nombre, apellido'),
  ])

  const sales = (rawSales ?? []) as SaleRow[]
  const prevSales = (rawPrevSales ?? []) as Array<{ id: string; total: number }>
  const allProducts = (rawProducts ?? []) as ProductRow[]
  const categories = (rawCategories ?? []) as CategoryRow[]
  const profiles = (rawProfiles ?? []) as ProfileRow[]

  const saleIds = sales.map((s) => s.id)
  const prevSaleIds = prevSales.map((s) => s.id)

  const [{ data: rawItems }, { data: rawPrevItems }] = await Promise.all([
    saleIds.length > 0
      ? supabase.from('sale_items').select('sale_id, product_id, cantidad, subtotal, promo_label').in('sale_id', saleIds)
      : Promise.resolve({ data: [] }),
    prevSaleIds.length > 0
      ? supabase.from('sale_items').select('sale_id, product_id, cantidad').in('sale_id', prevSaleIds)
      : Promise.resolve({ data: [] }),
  ])

  const items = (rawItems ?? []) as ItemRow[]
  const prevItems = (rawPrevItems ?? []) as PrevItemRow[]

  const productMap = new Map(allProducts.map((p) => [p.id, p]))
  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  // ── KPI ──────────────────────────────────────────────────────────────────
  const totalVendido = sales.reduce((a, s) => a + s.total, 0)
  const transacciones = sales.length
  const ticketPromedio = transacciones > 0 ? totalVendido / transacciones : 0
  const unidadesTotales = items.reduce((a, i) => a + i.cantidad, 0)

  const horaCounts = new Map<number, number>()
  for (const s of sales) {
    const h = new Date(s.created_at).getHours()
    horaCounts.set(h, (horaCounts.get(h) ?? 0) + 1)
  }
  let horaPico: number | null = null
  let maxH = 0
  for (const [h, cnt] of horaCounts) {
    if (cnt > maxH) { maxH = cnt; horaPico = h }
  }

  const kpi: AnalyticsKPI = {
    total_vendido: totalVendido,
    transacciones,
    ticket_promedio: ticketPromedio,
    unidades_totales: unidadesTotales,
    hora_pico: horaPico,
    prev_total_vendido: prevSales.reduce((a, s) => a + s.total, 0),
    prev_transacciones: prevSales.length,
  }

  // ── Gráfico ───────────────────────────────────────────────────────────────
  const diffDays = (hastaDate.getTime() - desdeDate.getTime()) / (1000 * 60 * 60 * 24)
  const gran = diffDays <= 1 ? 'hour' : diffDays <= 31 ? 'day' : 'month'

  const bucketKey = (dateStr: string) => {
    const d = new Date(dateStr)
    if (gran === 'hour') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
    if (gran === 'day') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    return `${d.getFullYear()}-${d.getMonth()}`
  }

  const bucketLabel = (key: string) => {
    const parts = key.split('-').map(Number)
    if (gran === 'hour') return `${String(parts[3]).padStart(2, '0')}:00`
    if (gran === 'day') {
      const d = new Date(parts[0], parts[1], parts[2])
      return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    }
    const d = new Date(parts[0], parts[1], 1)
    return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
  }

  const graficoMap = new Map<string, { monto: number; transacciones: number }>()
  for (const s of sales) {
    const key = bucketKey(s.created_at)
    const ex = graficoMap.get(key) ?? { monto: 0, transacciones: 0 }
    graficoMap.set(key, { monto: ex.monto + s.total, transacciones: ex.transacciones + 1 })
  }
  const grafico: PeriodPoint[] = Array.from(graficoMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ label: bucketLabel(key), ...v }))

  // ── Top 5 productos ───────────────────────────────────────────────────────
  const prodMap = new Map<string, { unidades: number; monto: number }>()
  for (const i of items) {
    const ex = prodMap.get(i.product_id) ?? { unidades: 0, monto: 0 }
    prodMap.set(i.product_id, { unidades: ex.unidades + i.cantidad, monto: ex.monto + i.subtotal })
  }
  const prevProdMap = new Map<string, number>()
  for (const i of prevItems) {
    prevProdMap.set(i.product_id, (prevProdMap.get(i.product_id) ?? 0) + i.cantidad)
  }
  const productos: ProductRankingItem[] = Array.from(prodMap.entries())
    .sort(([, a], [, b]) => b.unidades - a.unidades)
    .slice(0, 5)
    .map(([id, v]) => {
      const p = productMap.get(id)
      const cat = p?.category_id ? categoryMap.get(p.category_id) : null
      return {
        id,
        nombre: p?.nombre ?? 'Desconocido',
        emoji: p?.emoji ?? '📦',
        categoria: cat?.nombre ?? 'Sin categoría',
        unidades: v.unidades,
        monto: v.monto,
        prev_unidades: prevProdMap.get(id) ?? 0,
      }
    })

  // ── Promos analytics ─────────────────────────────────────────────────────
  // Cruzamos sale_items.promo_label con sales.created_at para calcular hora
  const saleTimeMap = new Map(sales.map((s) => [s.id, s.created_at]))

  const promoMap = new Map<string, { transacciones: number; unidades: number; monto: number; horas: number[] }>()
  for (const item of items) {
    if (!item.promo_label) continue
    const ex = promoMap.get(item.promo_label) ?? { transacciones: 0, unidades: 0, monto: 0, horas: [] }
    const createdAt = saleTimeMap.get(item.sale_id)
    const hora = createdAt ? new Date(createdAt).getHours() : null
    promoMap.set(item.promo_label, {
      transacciones: ex.transacciones + 1,
      unidades: ex.unidades + item.cantidad,
      monto: ex.monto + item.subtotal,
      horas: hora !== null ? [...ex.horas, hora] : ex.horas,
    })
  }

  const promos: PromoAnalyticsItem[] = Array.from(promoMap.entries())
    .sort(([, a], [, b]) => b.monto - a.monto)
    .map(([label, v]) => {
      // Calcular hora pico
      const horaCounts = new Map<number, number>()
      for (const h of v.horas) horaCounts.set(h, (horaCounts.get(h) ?? 0) + 1)
      let horaPico: number | null = null
      let maxHoraCnt = 0
      for (const [h, cnt] of horaCounts) {
        if (cnt > maxHoraCnt) { maxHoraCnt = cnt; horaPico = h }
      }
      const por_hora = Array.from(horaCounts.entries()).map(([hora, count]) => ({ hora, count }))
      return { label, transacciones: v.transacciones, unidades: v.unidades, monto: v.monto, hora_pico: horaPico, por_hora }
    })

  // ── Stock bajo ────────────────────────────────────────────────────────────
  const toItem = (p: ProductRow): NoMovementItem => {
    const cat = p.category_id ? categoryMap.get(p.category_id) : null
    return { id: p.id, nombre: p.nombre, emoji: p.emoji, stock: p.stock, stock_minimo: p.stock_minimo, categoria: cat?.nombre ?? 'Sin categoría' }
  }

  const stockBajo: NoMovementItem[] = allProducts
    .filter((p) => p.stock <= p.stock_minimo)
    .sort((a, b) => a.stock - b.stock)
    .map(toItem)

  // Required by DashboardAnalytics but not shown on dashboard
  const soldIds = new Set(items.map((i) => i.product_id))
  const sinMovimiento: NoMovementItem[] = allProducts
    .filter((p) => !soldIds.has(p.id))
    .slice(0, 20)
    .map(toItem)

  void profileMap // unused in dashboard but keep for type compatibility

  return {
    kpi,
    grafico,
    productos,
    categorias: [],
    pagos: [],
    empleados: [],
    sinMovimiento,
    stockBajo,
    promos,
  }
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className ?? ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-56" />
    </div>
  )
}

// ─── content ─────────────────────────────────────────────────────────────────

async function DashboardContent({ desde, hasta }: { desde: string; hasta: string }) {
  const data = await fetchDashboard(desde, hasta)

  return (
    <div className="flex flex-col gap-6">
      <KPICards kpi={data.kpi} />
      <SalesChart data={data.grafico} desde={desde} hasta={hasta} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductRanking productos={data.productos} />
        <NoMovementList sinMovimiento={[]} stockBajo={data.stockBajo} />
      </div>
      <PromoAnalytics promos={data.promos} />
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const defaults = getDefaultRange()
  const desde = params.desde ?? defaults.desde
  const hasta = params.hasta ?? defaults.hasta

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Vista ejecutiva · Para análisis profundo usá Analíticas</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton tipo="ventas" desde={desde} hasta={hasta} label="Exportar" />
          <DateRangePicker desde={desde} hasta={hasta} />
        </div>
      </div>

      {/* Alertas de vencimiento — siempre visibles */}
      <Suspense fallback={null}>
        <ExpiryAlerts />
      </Suspense>

      <Suspense key={`${desde}-${hasta}`} fallback={<DashboardSkeleton />}>
        <DashboardContent desde={desde} hasta={hasta} />
      </Suspense>
    </div>
  )
}
