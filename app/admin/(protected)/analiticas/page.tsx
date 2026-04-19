import { Suspense } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { DateRangePicker } from '@/components/admin/DateRangePicker'
import { ExportButton } from '@/components/admin/ExportButton'
import { KPICards } from '@/components/admin/KPICards'
import { SalesChart } from '@/components/admin/SalesChart'
import { ProductRanking } from '@/components/admin/ProductRanking'
import { NoMovementList } from '@/components/admin/NoMovementList'
import { CategoryChart } from '@/components/admin/CategoryChart'
import { PaymentMethodsChart } from '@/components/admin/PaymentMethodsChart'
import { EmployeeSalesTable } from '@/components/admin/EmployeeSalesTable'
import { HorariosPicoTable } from '@/components/admin/HorariosPicoTable'
import type {
  AnalyticsKPI,
  PeriodPoint,
  ProductRankingItem,
  CategorySalesItem,
  PaymentItem,
  EmployeeSalesItem,
  NoMovementItem,
} from '@/types/index'

export const revalidate = 0

// ─── helpers ────────────────────────────────────────────────────────────────

function getDefaultRange(): { desde: string; hasta: string } {
  const now = new Date()
  const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const y = arNow.getUTCFullYear()
  const m = arNow.getUTCMonth()
  const d = arNow.getUTCDate()
  const desde = new Date(Date.UTC(y, m, 1, 3, 0, 0, 0)).toISOString()
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

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── tipos locales ────────────────────────────────────────────────────────────

interface RentabilidadItem {
  id: string
  nombre: string
  emoji: string
  categoria: string
  precio: number
  costo: number
  margen_pct: number
  ganancia_total: number
  unidades: number
}

interface TendenciaItem {
  nombre: string
  emoji: string
  cambio_pct: number
  unidades: number
}

interface AnalyticsData {
  kpi: AnalyticsKPI
  grafico: PeriodPoint[]
  productos: ProductRankingItem[]
  categorias: CategorySalesItem[]
  pagos: PaymentItem[]
  empleados: EmployeeSalesItem[]
  sinMovimiento: NoMovementItem[]
  stockBajo: NoMovementItem[]
  horarioPico: number[][] // [24][7]  0=Lun..6=Dom
  resumenFinanciero: {
    total_vendido: number
    costo_total: number
    ganancia: number
    margen_pct: number
    tiene_costos: boolean
  }
  tendencias: {
    subiendo: TendenciaItem[]
    bajando: TendenciaItem[]
  }
  rentabilidad: RentabilidadItem[]
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function fetchAnalytics(desde: string, hasta: string): Promise<AnalyticsData> {
  const supabase = await createServiceClient()

  const desdeDate = new Date(desde)
  const hastaDate = new Date(hasta)
  const { prevDesde, prevHasta } = prevPeriod(desdeDate, hastaDate)

  type SaleRow = { id: string; total: number; metodo_pago: string; created_at: string; empleado_id: string | null }
  type ItemRow = { sale_id: string; product_id: string; cantidad: number; subtotal: number }
  type PrevItemRow = { sale_id: string; product_id: string; cantidad: number }
  type ProductRow = {
    id: string
    nombre: string
    emoji: string
    category_id: string | null
    costo_unitario: number | null
    precio: number
    stock: number
    stock_minimo: number
  }
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
      .select('id, nombre, emoji, category_id, costo_unitario, precio, stock, stock_minimo')
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
      ? supabase.from('sale_items').select('sale_id, product_id, cantidad, subtotal').in('sale_id', saleIds)
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

  // ── Horarios pico (24×7) ──────────────────────────────────────────────────
  // matrix[hour][displayDay]  displayDay: 0=Lun, 1=Mar, ..., 6=Dom
  const horarioPico: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0))
  for (const s of sales) {
    const d = new Date(s.created_at)
    const hour = d.getHours()
    const jsDay = d.getDay() // 0=Dom, 1=Lun, ..., 6=Sáb
    const displayDay = (jsDay + 6) % 7  // 0=Lun..6=Dom
    horarioPico[hour][displayDay]++
  }

  // ── Productos ranking — top 20 ─────────────────────────────────────────────
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
    .slice(0, 20)
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

  // ── Tendencias ────────────────────────────────────────────────────────────
  const subiendo: TendenciaItem[] = Array.from(prodMap.entries())
    .filter(([id, v]) => {
      const prev = prevProdMap.get(id) ?? 0
      return prev > 0 && v.unidades > prev
    })
    .map(([id, v]) => {
      const prev = prevProdMap.get(id) ?? 0
      const p = productMap.get(id)
      return {
        nombre: p?.nombre ?? 'Desconocido',
        emoji: p?.emoji ?? '📦',
        cambio_pct: ((v.unidades - prev) / prev) * 100,
        unidades: v.unidades,
      }
    })
    .sort((a, b) => b.cambio_pct - a.cambio_pct)
    .slice(0, 5)

  const bajando: TendenciaItem[] = Array.from(prodMap.entries())
    .filter(([id, v]) => {
      const prev = prevProdMap.get(id) ?? 0
      return prev > 0 && v.unidades < prev
    })
    .map(([id, v]) => {
      const prev = prevProdMap.get(id) ?? 0
      const p = productMap.get(id)
      return {
        nombre: p?.nombre ?? 'Desconocido',
        emoji: p?.emoji ?? '📦',
        cambio_pct: ((v.unidades - prev) / prev) * 100,
        unidades: v.unidades,
      }
    })
    .sort((a, b) => a.cambio_pct - b.cambio_pct)
    .slice(0, 5)

  // ── Rentabilidad (requiere costo_unitario) ────────────────────────────────
  const rentabilidad: RentabilidadItem[] = Array.from(prodMap.entries())
    .filter(([id]) => {
      const p = productMap.get(id)
      return p?.costo_unitario != null && p.costo_unitario > 0
    })
    .map(([id, v]) => {
      const p = productMap.get(id)!
      const cat = p.category_id ? categoryMap.get(p.category_id) : null
      const costo = p.costo_unitario!
      const precio = p.precio
      const margen_pct = precio > 0 ? ((precio - costo) / precio) * 100 : 0
      return {
        id,
        nombre: p.nombre,
        emoji: p.emoji,
        categoria: cat?.nombre ?? 'Sin categoría',
        precio,
        costo,
        margen_pct,
        ganancia_total: v.unidades * (precio - costo),
        unidades: v.unidades,
      }
    })
    .sort((a, b) => b.ganancia_total - a.ganancia_total)

  // ── Resumen financiero ────────────────────────────────────────────────────
  let costoTotal = 0
  let tieneCostos = false
  for (const i of items) {
    const p = productMap.get(i.product_id)
    if (p?.costo_unitario != null && p.costo_unitario > 0) {
      costoTotal += i.cantidad * p.costo_unitario
      tieneCostos = true
    }
  }
  const resumenFinanciero = {
    total_vendido: totalVendido,
    costo_total: costoTotal,
    ganancia: totalVendido - costoTotal,
    margen_pct: totalVendido > 0 ? ((totalVendido - costoTotal) / totalVendido) * 100 : 0,
    tiene_costos: tieneCostos,
  }

  // ── Categorías ────────────────────────────────────────────────────────────
  const catMap = new Map<string, { unidades: number; monto: number; catId: string }>()
  for (const i of items) {
    const p = productMap.get(i.product_id)
    const catId = p?.category_id ?? '__sin'
    const ex = catMap.get(catId) ?? { unidades: 0, monto: 0, catId }
    catMap.set(catId, { unidades: ex.unidades + i.cantidad, monto: ex.monto + i.subtotal, catId })
  }
  const categorias: CategorySalesItem[] = Array.from(catMap.values())
    .sort((a, b) => b.monto - a.monto)
    .map((v) => {
      const cat = categoryMap.get(v.catId)
      return { nombre: cat?.nombre ?? 'Sin categoría', emoji: cat?.emoji ?? '📦', unidades: v.unidades, monto: v.monto }
    })

  // ── Pagos ─────────────────────────────────────────────────────────────────
  const pagosMap = new Map<string, { monto: number; cantidad: number }>()
  for (const s of sales) {
    const ex = pagosMap.get(s.metodo_pago) ?? { monto: 0, cantidad: 0 }
    pagosMap.set(s.metodo_pago, { monto: ex.monto + s.total, cantidad: ex.cantidad + 1 })
  }
  const metodosLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    mercadopago: 'Mercado Pago',
    transferencia: 'Transferencia',
  }
  const pagos: PaymentItem[] = Array.from(pagosMap.entries())
    .sort(([, a], [, b]) => b.monto - a.monto)
    .map(([metodo, v]) => ({ metodo, label: metodosLabels[metodo] ?? metodo, ...v }))

  // ── Empleados ─────────────────────────────────────────────────────────────
  const empMap = new Map<string, { ventas: number; monto: number }>()
  for (const s of sales) {
    if (!s.empleado_id) continue
    const ex = empMap.get(s.empleado_id) ?? { ventas: 0, monto: 0 }
    empMap.set(s.empleado_id, { ventas: ex.ventas + 1, monto: ex.monto + s.total })
  }
  const empleados: EmployeeSalesItem[] = Array.from(empMap.entries())
    .sort(([, a], [, b]) => b.monto - a.monto)
    .map(([id, v]) => {
      const p = profileMap.get(id)
      return { nombre: p?.nombre ?? 'Empleado', apellido: p?.apellido ?? null, ventas: v.ventas, monto: v.monto, ticket: v.ventas > 0 ? v.monto / v.ventas : 0 }
    })

  // ── Sin movimiento & stock bajo ───────────────────────────────────────────
  const soldIds = new Set(items.map((i) => i.product_id))
  const toItem = (p: ProductRow): NoMovementItem => {
    const cat = p.category_id ? categoryMap.get(p.category_id) : null
    return { id: p.id, nombre: p.nombre, emoji: p.emoji, stock: p.stock, stock_minimo: p.stock_minimo, categoria: cat?.nombre ?? 'Sin categoría' }
  }
  const sinMovimiento: NoMovementItem[] = allProducts.filter((p) => !soldIds.has(p.id)).slice(0, 20).map(toItem)
  const stockBajo: NoMovementItem[] = allProducts.filter((p) => p.stock <= p.stock_minimo).sort((a, b) => a.stock - b.stock).map(toItem)

  return { kpi, grafico, productos, categorias, pagos, empleados, sinMovimiento, stockBajo, horarioPico, resumenFinanciero, tendencias: { subiendo, bajando }, rentabilidad }
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className ?? ''}`} />
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-48" />
    </div>
  )
}

// ─── sub-secciones ────────────────────────────────────────────────────────────

function ResumenFinanciero({ data }: { data: AnalyticsData['resumenFinanciero'] }) {
  if (!data.tiene_costos) return null
  return (
    <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/10 p-5">
      <div className="mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Resumen financiero estimado</h2>
        <span className="text-xs text-emerald-600 dark:text-emerald-500">(productos con costo registrado)</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Total vendido</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{fmt(data.total_vendido)}</p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Costo estimado</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{fmt(data.costo_total)}</p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Ganancia estimada</p>
          <p className={`text-lg font-bold ${data.ganancia >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
            {fmt(data.ganancia)}
          </p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Margen promedio</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{data.margen_pct.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

function Tendencias({ tendencias }: { tendencias: AnalyticsData['tendencias'] }) {
  const { subiendo, bajando } = tendencias
  if (subiendo.length === 0 && bajando.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {subiendo.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mayor crecimiento</h3>
          </div>
          <div className="flex flex-col gap-2">
            {subiendo.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{p.emoji}</span>
                  <span className="truncate text-sm text-gray-800 dark:text-gray-200">{p.nombre}</span>
                </div>
                <span className="ml-2 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  +{p.cambio_pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {bajando.length > 0 && (
        <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mayor caída</h3>
          </div>
          <div className="flex flex-col gap-2">
            {bajando.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{p.emoji}</span>
                  <span className="truncate text-sm text-gray-800 dark:text-gray-200">{p.nombre}</span>
                </div>
                <span className="ml-2 shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                  {p.cambio_pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RentabilidadTable({ items }: { items: RentabilidadItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Análisis de rentabilidad por producto</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="pb-2 text-left text-xs font-medium text-gray-400">Producto</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400 hidden sm:table-cell">Costo</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400 hidden sm:table-cell">Precio</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Margen</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Ganancia total</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400 hidden md:table-cell">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span>{p.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.categoria}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">{fmt(p.costo)}</td>
                <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">{fmt(p.precio)}</td>
                <td className="py-2.5 pr-3 text-right">
                  <span className={`text-xs font-semibold ${p.margen_pct >= 30 ? 'text-emerald-600' : p.margen_pct >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                    {p.margen_pct.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {fmt(p.ganancia_total)}
                </td>
                <td className="py-2.5 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
                  {new Intl.NumberFormat('es-AR').format(p.unidades)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── content ─────────────────────────────────────────────────────────────────

async function AnaliticasContent({ desde, hasta }: { desde: string; hasta: string }) {
  const data = await fetchAnalytics(desde, hasta)

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs + Resumen financiero */}
      <KPICards kpi={data.kpi} />
      <ResumenFinanciero data={data.resumenFinanciero} />

      {/* Gráfico de ventas */}
      <SalesChart data={data.grafico} desde={desde} hasta={hasta} />

      {/* Horarios pico */}
      <HorariosPicoTable matrix={data.horarioPico} />

      {/* Top 20 + sin movimiento / stock bajo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductRanking productos={data.productos} />
        <NoMovementList sinMovimiento={data.sinMovimiento} stockBajo={data.stockBajo} />
      </div>

      {/* Tendencias vs período anterior */}
      <Tendencias tendencias={data.tendencias} />

      {/* Rentabilidad (solo si hay costos cargados) */}
      <RentabilidadTable items={data.rentabilidad} />

      {/* Categorías + Métodos de pago */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryChart categorias={data.categorias} />
        <PaymentMethodsChart pagos={data.pagos} />
      </div>

      {/* Ventas por empleado */}
      <EmployeeSalesTable empleados={data.empleados} />
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function AnaliticasPage({
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analíticas</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Análisis profundo · Todos los datos del período seleccionado</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton tipo="ventas" desde={desde} hasta={hasta} label="Exportar ventas" />
          <DateRangePicker desde={desde} hasta={hasta} />
        </div>
      </div>

      <Suspense key={`${desde}-${hasta}`} fallback={<PageSkeleton />}>
        <AnaliticasContent desde={desde} hasta={hasta} />
      </Suspense>
    </div>
  )
}
