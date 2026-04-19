import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
import type {
  AnalyticsKPI,
  PeriodPoint,
  ProductRankingItem,
  CategorySalesItem,
  PaymentItem,
  EmployeeSalesItem,
  NoMovementItem,
  PromoAnalyticsItem,
  DashboardAnalytics,
} from '@/types/index'

// ─── helpers ────────────────────────────────────────────────────────────────

function prevPeriod(desde: Date, hasta: Date): { prevDesde: Date; prevHasta: Date } {
  const diffMs = hasta.getTime() - desde.getTime()
  const prevHasta = new Date(desde.getTime() - 1)
  const prevDesde = new Date(desde.getTime() - diffMs)
  return { prevDesde, prevHasta }
}

type SaleRow = {
  id: string
  total: number
  metodo_pago: string
  created_at: string
  empleado_id: string | null
}

type SaleItemRow = {
  sale_id: string
  product_id: string
  cantidad: number
  subtotal: number
  promo_label: string | null
}

type ProductRow = {
  id: string
  nombre: string
  emoji: string
  category_id: string | null
  stock: number
  stock_minimo: number
  activo: boolean
}

type CategoryRow = {
  id: string
  nombre: string
  emoji: string | null
}

type ProfileRow = {
  id: string
  nombre: string | null
  apellido: string | null
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const role = await getRole()
    if (role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Sin autorización' }, { status: 403 })
    }

    const supabase = await createServiceClient()
    const { searchParams } = request.nextUrl

    const desdeParam = searchParams.get('desde')
    const hastaParam = searchParams.get('hasta')

    if (!desdeParam || !hastaParam) {
      return NextResponse.json(
        { data: null, error: 'Parámetros desde y hasta requeridos' },
        { status: 400 },
      )
    }

    const desde = new Date(desdeParam)
    const hasta = new Date(hastaParam)
    const { prevDesde, prevHasta } = prevPeriod(desde, hasta)

    // ── 1. Sales current period ──────────────────────────────────────────────
    const { data: rawSales } = await supabase
      .from('sales')
      .select('id, total, metodo_pago, created_at, empleado_id')
      .eq('estado', 'completada')
      .gte('created_at', desde.toISOString())
      .lte('created_at', hasta.toISOString())

    const sales = (rawSales ?? []) as SaleRow[]

    // ── 2. Sales previous period ─────────────────────────────────────────────
    const { data: rawPrevSales } = await supabase
      .from('sales')
      .select('id, total')
      .eq('estado', 'completada')
      .gte('created_at', prevDesde.toISOString())
      .lte('created_at', prevHasta.toISOString())

    const prevSales = (rawPrevSales ?? []) as Array<{ id: string; total: number }>

    // ── 3. Sale items current period ─────────────────────────────────────────
    const saleIds = sales.map((s) => s.id)
    const { data: rawItems } =
      saleIds.length > 0
        ? await supabase
            .from('sale_items')
            .select('sale_id, product_id, cantidad, subtotal, promo_label')
            .in('sale_id', saleIds)
        : { data: [] }

    const items = (rawItems ?? []) as SaleItemRow[]

    // ── 4. Sale items previous period ────────────────────────────────────────
    const prevSaleIds = prevSales.map((s) => s.id)
    const { data: rawPrevItems } =
      prevSaleIds.length > 0
        ? await supabase
            .from('sale_items')
            .select('sale_id, product_id, cantidad')
            .in('sale_id', prevSaleIds)
        : { data: [] }

    const prevItems = (rawPrevItems ?? []) as Array<{
      sale_id: string
      product_id: string
      cantidad: number
    }>

    // ── 5. Products & categories ─────────────────────────────────────────────
    const [{ data: rawProducts }, { data: rawCategories }, { data: rawProfiles }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, nombre, emoji, category_id, stock, stock_minimo, activo')
          .eq('activo', true),
        supabase.from('categories').select('id, nombre, emoji'),
        supabase.from('profiles').select('id, nombre, apellido').eq('role', 'empleado'),
      ])

    const allProducts = (rawProducts ?? []) as ProductRow[]
    const categories = (rawCategories ?? []) as CategoryRow[]
    const profiles = (rawProfiles ?? []) as ProfileRow[]

    // ── Build lookup maps ────────────────────────────────────────────────────
    const productMap = new Map(allProducts.map((p) => [p.id, p]))
    const categoryMap = new Map(categories.map((c) => [c.id, c]))

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const totalVendido = sales.reduce((a, s) => a + s.total, 0)
    const transacciones = sales.length
    const ticketPromedio = transacciones > 0 ? totalVendido / transacciones : 0
    const unidadesTotales = items.reduce((a, i) => a + i.cantidad, 0)

    const horeCounts = new Map<number, number>()
    for (const s of sales) {
      const h = new Date(s.created_at).getHours()
      horeCounts.set(h, (horeCounts.get(h) ?? 0) + 1)
    }
    let horaPico: number | null = null
    let maxHora = 0
    for (const [h, cnt] of horeCounts) {
      if (cnt > maxHora) { maxHora = cnt; horaPico = h }
    }

    const prevTotalVendido = prevSales.reduce((a, s) => a + s.total, 0)
    const prevTransacciones = prevSales.length

    const kpi: AnalyticsKPI = {
      total_vendido: totalVendido,
      transacciones,
      ticket_promedio: ticketPromedio,
      unidades_totales: unidadesTotales,
      hora_pico: horaPico,
      prev_total_vendido: prevTotalVendido,
      prev_transacciones: prevTransacciones,
    }

    // ── Gráfico ──────────────────────────────────────────────────────────────
    const diffDays = (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)
    const granularity = diffDays <= 1 ? 'hour' : diffDays <= 31 ? 'day' : 'month'

    const bucketKey = (dateStr: string): string => {
      const d = new Date(dateStr)
      if (granularity === 'hour') {
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
      } else if (granularity === 'day') {
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      } else {
        return `${d.getFullYear()}-${d.getMonth()}`
      }
    }

    const bucketLabel = (key: string): string => {
      const parts = key.split('-').map(Number)
      if (granularity === 'hour') {
        return `${String(parts[3]).padStart(2, '0')}:00`
      } else if (granularity === 'day') {
        const d = new Date(parts[0], parts[1], parts[2])
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      } else {
        const d = new Date(parts[0], parts[1], 1)
        return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      }
    }

    const graficoMap = new Map<string, { monto: number; transacciones: number }>()
    for (const s of sales) {
      const key = bucketKey(s.created_at)
      const existing = graficoMap.get(key) ?? { monto: 0, transacciones: 0 }
      graficoMap.set(key, { monto: existing.monto + s.total, transacciones: existing.transacciones + 1 })
    }

    const grafico: PeriodPoint[] = Array.from(graficoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ label: bucketLabel(key), ...v }))

    // ── Productos ranking ─────────────────────────────────────────────────────
    const prodMap = new Map<string, { unidades: number; monto: number }>()
    for (const item of items) {
      const existing = prodMap.get(item.product_id) ?? { unidades: 0, monto: 0 }
      prodMap.set(item.product_id, {
        unidades: existing.unidades + item.cantidad,
        monto: existing.monto + item.subtotal,
      })
    }

    const prevProdMap = new Map<string, number>()
    for (const item of prevItems) {
      prevProdMap.set(item.product_id, (prevProdMap.get(item.product_id) ?? 0) + item.cantidad)
    }

    const totalUnidades = Array.from(prodMap.values()).reduce((a, v) => a + v.unidades, 0)

    const productos: ProductRankingItem[] = Array.from(prodMap.entries())
      .sort(([, a], [, b]) => b.unidades - a.unidades)
      .slice(0, 10)
      .map(([id, v]) => {
        const prod = productMap.get(id)
        const cat = prod?.category_id ? categoryMap.get(prod.category_id) : null
        return {
          id,
          nombre: prod?.nombre ?? 'Desconocido',
          emoji: prod?.emoji ?? '📦',
          categoria: cat?.nombre ?? 'Sin categoría',
          unidades: v.unidades,
          monto: v.monto,
          prev_unidades: prevProdMap.get(id) ?? 0,
          porcentaje: totalUnidades > 0 ? (v.unidades / totalUnidades) * 100 : 0,
        } as ProductRankingItem & { porcentaje: number }
      })

    // ── Categorías ────────────────────────────────────────────────────────────
    const catStatsMap = new Map<string, { unidades: number; monto: number }>()
    for (const item of items) {
      const prod = productMap.get(item.product_id)
      const catId = prod?.category_id ?? 'sin-categoria'
      const existing = catStatsMap.get(catId) ?? { unidades: 0, monto: 0 }
      catStatsMap.set(catId, {
        unidades: existing.unidades + item.cantidad,
        monto: existing.monto + item.subtotal,
      })
    }

    const totalMontoVentas = items.reduce((a, i) => a + i.subtotal, 0)

    const categorias: CategorySalesItem[] = Array.from(catStatsMap.entries())
      .sort(([, a], [, b]) => b.monto - a.monto)
      .map(([catId, v]) => {
        const cat = categoryMap.get(catId)
        return {
          nombre: cat?.nombre ?? 'Sin categoría',
          emoji: cat?.emoji ?? '📦',
          unidades: v.unidades,
          monto: v.monto,
          porcentaje: totalMontoVentas > 0 ? (v.monto / totalMontoVentas) * 100 : 0,
        } as CategorySalesItem & { porcentaje: number }
      })

    // ── Pagos ─────────────────────────────────────────────────────────────────
    const pagosMap = new Map<string, { monto: number; cantidad: number }>()
    for (const s of sales) {
      const existing = pagosMap.get(s.metodo_pago) ?? { monto: 0, cantidad: 0 }
      pagosMap.set(s.metodo_pago, { monto: existing.monto + s.total, cantidad: existing.cantidad + 1 })
    }

    const metodosLabels: Record<string, string> = {
      efectivo: 'Efectivo',
      mercadopago: 'Mercado Pago',
      transferencia: 'Transferencia',
    }

    const pagos: PaymentItem[] = Array.from(pagosMap.entries())
      .sort(([, a], [, b]) => b.monto - a.monto)
      .map(([metodo, v]) => ({
        metodo,
        label: metodosLabels[metodo] ?? metodo,
        monto: v.monto,
        cantidad: v.cantidad,
      }))

    // ── Empleados ─────────────────────────────────────────────────────────────
    const empStatsMap = new Map<string, { ventas: number; monto: number }>()
    for (const s of sales) {
      if (!s.empleado_id) continue
      const existing = empStatsMap.get(s.empleado_id) ?? { ventas: 0, monto: 0 }
      empStatsMap.set(s.empleado_id, { ventas: existing.ventas + 1, monto: existing.monto + s.total })
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    const empleados: EmployeeSalesItem[] = Array.from(empStatsMap.entries())
      .sort(([, a], [, b]) => b.monto - a.monto)
      .map(([id, v]) => {
        const p = profileMap.get(id)
        return {
          nombre: p?.nombre ?? 'Empleado',
          apellido: p?.apellido ?? null,
          ventas: v.ventas,
          monto: v.monto,
          ticket: v.ventas > 0 ? v.monto / v.ventas : 0,
        }
      })

    // ── Sin movimiento ────────────────────────────────────────────────────────
    const soldProductIds = new Set(items.map((i) => i.product_id))

    const sinMovimiento: NoMovementItem[] = allProducts
      .filter((p) => !soldProductIds.has(p.id))
      .slice(0, 20)
      .map((p) => {
        const cat = p.category_id ? categoryMap.get(p.category_id) : null
        return {
          id: p.id,
          nombre: p.nombre,
          emoji: p.emoji,
          stock: p.stock,
          stock_minimo: p.stock_minimo,
          categoria: cat?.nombre ?? 'Sin categoría',
        }
      })

    const stockBajo: NoMovementItem[] = allProducts
      .filter((p) => p.stock <= p.stock_minimo)
      .sort((a, b) => a.stock - b.stock)
      .map((p) => {
        const cat = p.category_id ? categoryMap.get(p.category_id) : null
        return {
          id: p.id,
          nombre: p.nombre,
          emoji: p.emoji,
          stock: p.stock,
          stock_minimo: p.stock_minimo,
          categoria: cat?.nombre ?? 'Sin categoría',
        }
      })

    // ── Promos analytics ──────────────────────────────────────────────────────
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

    const result: DashboardAnalytics = {
      kpi,
      grafico,
      productos,
      categorias,
      pagos,
      empleados,
      sinMovimiento,
      stockBajo,
      promos,
    }

    return NextResponse.json({ data: result, error: null })
  } catch (err) {
    console.error('[analytics]', err)
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
