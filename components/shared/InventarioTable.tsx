'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types/index'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type FiltroVencimiento = 'todos' | 'vencidos' | 'hoy' | '7dias' | '30dias' | 'mes'

export interface ExpiryItem {
  id: string
  nombre: string
  emoji: string
  tipo: 'producto' | 'variante'
  producto_id: string
  producto_nombre?: string
  fecha_vencimiento: string
  stock: number
  stock_minimo: number
  categoria?: string
}

export interface InventarioTableProps {
  products: Product[]
  loading: boolean
  filtro: FiltroVencimiento
  isAdmin?: boolean
  onNavigate: (filtro: FiltroVencimiento) => void
  /** Called after a quick-stock update so the parent can re-fetch */
  onStockChanged?: () => void
}

// ─── Constantes ──────────────────────────────────────────────────────────────

export const FILTROS: { key: FiltroVencimiento; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'vencidos', label: 'Vencidos' },
  { key: 'hoy', label: 'Vencen hoy' },
  { key: '7dias', label: 'Próximos 7 días' },
  { key: '30dias', label: 'Próximos 30 días' },
  { key: 'mes', label: 'Este mes' },
]

// ─── Utilidades ──────────────────────────────────────────────────────────────

export function diasRestantes(fechaVenc: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fechaVenc + 'T00:00:00')
  return Math.floor((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export function buildExpiryList(products: Product[]): ExpiryItem[] {
  const items: ExpiryItem[] = []
  for (const p of products) {
    const categoria = p.categories?.nombre
    if (p.fecha_vencimiento) {
      items.push({
        id: p.id,
        nombre: p.nombre,
        emoji: p.emoji,
        tipo: 'producto',
        producto_id: p.id,
        fecha_vencimiento: p.fecha_vencimiento,
        stock: p.stock,
        stock_minimo: p.stock_minimo,
        categoria,
      })
    }
    for (const v of p.product_variants ?? []) {
      if (v.fecha_vencimiento && v.activo) {
        items.push({
          id: v.id,
          nombre: v.nombre,
          emoji: p.emoji,
          tipo: 'variante',
          producto_id: p.id,
          producto_nombre: p.nombre,
          fecha_vencimiento: v.fecha_vencimiento,
          stock: v.stock,
          stock_minimo: v.stock_minimo ?? 5,
          categoria,
        })
      }
    }
  }
  return items.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
}

export function applyFilter(items: ExpiryItem[], filtro: FiltroVencimiento): ExpiryItem[] {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7)
  const en30 = new Date(hoy); en30.setDate(hoy.getDate() + 30)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

  return items.filter((item) => {
    const venc = new Date(item.fecha_vencimiento + 'T00:00:00')
    if (filtro === 'vencidos') return venc < hoy
    if (filtro === 'hoy') return venc.getTime() === hoy.getTime()
    if (filtro === '7dias') return venc >= hoy && venc <= en7
    if (filtro === '30dias') return venc >= hoy && venc <= en30
    if (filtro === 'mes') return venc >= hoy && venc <= finMes
    return true
  })
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function EstadoBadge({ fechaVenc }: { fechaVenc: string | null }) {
  if (!fechaVenc) return <Badge variant="default">Sin fecha</Badge>
  const dias = diasRestantes(fechaVenc)
  if (dias < 0) return <Badge variant="danger">Vencido</Badge>
  if (dias === 0) return <Badge variant="danger">Hoy</Badge>
  if (dias <= 3) return <Badge variant="warning">Crítico</Badge>
  if (dias <= 7) return <Badge variant="warning">Próximo</Badge>
  return <Badge variant="success">OK</Badge>
}

function DiasBadge({ dias }: { dias: number }) {
  const cls =
    dias < 0 ? 'text-red-600 font-semibold' :
    dias <= 3 ? 'text-amber-600 font-semibold' :
    'text-gray-500'
  const label = dias < 0 ? `hace ${Math.abs(dias)}d` : dias === 0 ? 'hoy' : `${dias}d`
  return <span className={cls}>{label}</span>
}

function FilterBar({
  filtro,
  onNavigate,
}: {
  filtro: FiltroVencimiento
  onNavigate: (k: FiltroVencimiento) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
      {FILTROS.map((f) => (
        <button
          key={f.key}
          onClick={() => onNavigate(f.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filtro === f.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Quick stock input (admin) ────────────────────────────────────────────────

function QuickStockCell({
  productId,
  variantId,
  onSuccess,
}: {
  productId: string
  variantId?: string
  onSuccess: () => void
}) {
  const [qty, setQty] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function apply() {
    if (qty <= 0) return
    setSaving(true)
    try {
      await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId ?? null,
          cantidad: qty,
          motivo: 'compra',
        }),
      })
      setDone(true)
      setQty(0)
      setTimeout(() => setDone(false), 2000)
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        value={qty || ''}
        onChange={(e) => setQty(parseInt(e.target.value) || 0)}
        placeholder="+0"
        className="w-14 rounded border border-gray-300 px-1.5 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      <button
        onClick={apply}
        disabled={saving || qty <= 0}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          done
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40'
        }`}
      >
        {saving ? '…' : done ? '✓' : 'Agregar'}
      </button>
    </div>
  )
}

// ─── Variant sub-table ────────────────────────────────────────────────────────

function VariantSubTable({ product, isAdmin }: { product: import('@/types/index').Product; isAdmin?: boolean }) {
  const variants = product.product_variants ?? []
  if (variants.length === 0) return null
  return (
    <tr>
      <td colSpan={isAdmin ? 8 : 6} className="bg-gray-50/80 px-4 pb-3 dark:bg-gray-800/60">
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Variante</th>
                <th className="hidden px-3 py-2 text-left font-medium text-gray-500 sm:table-cell">Presentación</th>
                <th className="hidden px-3 py-2 text-right font-medium text-gray-500 sm:table-cell">Capacidad</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Precio</th>
                {isAdmin && <th className="hidden px-3 py-2 text-right font-medium text-gray-500 lg:table-cell">Costo</th>}
                {isAdmin && <th className="hidden px-3 py-2 text-right font-medium text-gray-500 lg:table-cell">Margen</th>}
                <th className="px-3 py-2 text-right font-medium text-gray-500">Stock</th>
                <th className="hidden px-3 py-2 text-center font-medium text-gray-500 sm:table-cell">Vencimiento</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {variants.filter((v) => v.activo).map((v) => {
                const precio = v.precio_variante ?? (product.precio + v.precio_extra)
                const margen = isAdmin && v.costo_variante && precio > 0
                  ? ((precio - v.costo_variante) / precio) * 100
                  : null
                const stockLow = v.stock <= (v.stock_minimo ?? 5)
                return (
                  <tr key={v.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                      {v.descripcion_completa ?? v.nombre}
                    </td>
                    <td className="hidden px-3 py-2 text-gray-500 dark:text-gray-400 sm:table-cell capitalize">
                      {v.presentacion ?? '—'}
                    </td>
                    <td className="hidden px-3 py-2 text-right text-gray-500 dark:text-gray-400 sm:table-cell">
                      {v.capacidad ? `${v.capacidad} ${v.capacidad_unidad ?? ''}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {fmt(precio)}
                    </td>
                    {isAdmin && (
                      <td className="hidden px-3 py-2 text-right text-gray-500 dark:text-gray-400 lg:table-cell">
                        {v.costo_variante ? fmt(v.costo_variante) : '—'}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="hidden px-3 py-2 text-right lg:table-cell">
                        {margen !== null ? (
                          <span className={`font-semibold ${margen >= 30 ? 'text-emerald-600' : margen >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {margen.toFixed(0)}%
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <span className={`font-semibold ${v.stock === 0 ? 'text-red-600' : stockLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {v.stock}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-center text-gray-500 dark:text-gray-400 sm:table-cell">
                      {v.fecha_vencimiento ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <EstadoBadge fechaVenc={v.fecha_vencimiento} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InventarioTable({
  products,
  loading,
  filtro,
  isAdmin = false,
  onNavigate,
  onStockChanged,
}: InventarioTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const allExpiryItems = buildExpiryList(products)
  const filteredItems = filtro === 'todos' ? allExpiryItems : applyFilter(allExpiryItems, filtro)

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterBar filtro={filtro} onNavigate={onNavigate} />

      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          {/* ── Vista filtrada por vencimiento ──────────────────────────── */}
          {filtro !== 'todos' && (
            filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm text-gray-400">No hay productos con ese filtro de vencimiento</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500">
                    {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
                    {' '}— ordenados por fecha más próxima
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Producto / Variante</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Stock</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Vencimiento</th>
                      <th className="hidden px-4 py-3 text-center text-xs font-medium text-gray-500 sm:table-cell">Días</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Estado</th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredItems.map((item) => {
                      const dias = diasRestantes(item.fecha_vencimiento)
                      const stockBajo = item.stock <= item.stock_minimo
                      return (
                        <tr key={`${item.tipo}-${item.id}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg leading-none">{item.emoji}</span>
                              <div>
                                {item.tipo === 'variante' ? (
                                  <>
                                    <p className="text-xs text-gray-400">{item.producto_nombre}</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.nombre}</p>
                                  </>
                                ) : (
                                  <p className="font-medium text-gray-900 dark:text-gray-100">{item.nombre}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.tipo === 'variante'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {item.tipo === 'variante' ? 'Variante' : 'Producto base'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${
                              item.stock === 0 ? 'text-red-600' : stockBajo ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {item.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                            {item.fecha_vencimiento}
                          </td>
                          <td className="hidden px-4 py-3 text-center sm:table-cell">
                            <DiasBadge dias={dias} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <EstadoBadge fechaVenc={item.fecha_vencimiento} />
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-center">
                              <Link
                                href="/admin/inventario"
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-indigo-700 transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                <Pencil className="h-3 w-3" />
                                Editar
                              </Link>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Vista "todos" ────────────────────────────────────────────── */}
          {filtro === 'todos' && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {products.length} producto{products.length !== 1 ? 's' : ''} en total
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">Categoría</th>
                    {isAdmin && (
                      <>
                        <th className="hidden px-4 py-3 text-right text-xs font-medium text-gray-500 lg:table-cell">Costo</th>
                        <th className="hidden px-4 py-3 text-right text-xs font-medium text-gray-500 lg:table-cell">Margen</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Precio</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Stock</th>
                    <th className="hidden px-4 py-3 text-center text-xs font-medium text-gray-500 sm:table-cell">Vencimiento</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Estado</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {products.map((p) => {
                    const variantesConFecha = (p.product_variants ?? []).filter(
                      (v) => v.fecha_vencimiento && v.activo,
                    ).length
                    const margen =
                      p.costo_unitario && p.precio > 0
                        ? ((p.precio - p.costo_unitario) / p.precio) * 100
                        : null
                    const hasVariants = (p.product_variants ?? []).filter((v) => v.activo).length > 0
                    const isExpanded = expandedRows.has(p.id)

                    return (
                      <React.Fragment key={p.id}>
                      <tr
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/40 ${hasVariants ? 'cursor-pointer' : ''}`}
                        onClick={hasVariants ? () => toggleRow(p.id) : undefined}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {hasVariants ? (
                              isExpanded
                                ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            ) : (
                              <span className="w-4 flex-shrink-0" />
                            )}
                            <span className="text-xl leading-none">{p.emoji}</span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{p.nombre}</p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {p.marca && <p className="text-xs text-gray-400">{p.marca}</p>}
                                {variantesConFecha > 0 && (
                                  <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                                    {variantesConFecha} var. con fecha
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-gray-500 dark:text-gray-400 sm:table-cell">
                          {p.categories?.nombre ?? '—'}
                        </td>
                        {isAdmin && (
                          <>
                            <td className="hidden px-4 py-3 text-right text-gray-500 dark:text-gray-400 lg:table-cell">
                              {p.costo_unitario ? fmt(p.costo_unitario) : '—'}
                            </td>
                            <td className="hidden px-4 py-3 text-right lg:table-cell">
                              {margen !== null ? (
                                <span className={`font-semibold ${
                                  margen >= 30 ? 'text-emerald-600' :
                                  margen >= 15 ? 'text-amber-600' :
                                  'text-red-600'
                                }`}>
                                  {margen.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(p.precio)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${
                            p.stock === 0 ? 'text-red-600' :
                            p.stock <= p.stock_minimo ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {p.stock} {p.unidad}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                            {p.fecha_vencimiento ? (
                              <>
                                <p>{p.fecha_vencimiento}</p>
                                <DiasBadge dias={diasRestantes(p.fecha_vencimiento)} />
                              </>
                            ) : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.stock === 0 ? (
                            <Badge variant="danger">Sin stock</Badge>
                          ) : p.stock <= p.stock_minimo ? (
                            <Badge variant="warning">Stock bajo</Badge>
                          ) : p.fecha_vencimiento && diasRestantes(p.fecha_vencimiento) <= 7 ? (
                            <Badge variant="warning">Por vencer</Badge>
                          ) : (
                            <Badge variant="success">OK</Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-1.5">
                              <QuickStockCell
                                productId={p.id}
                                onSuccess={onStockChanged ?? (() => {})}
                              />
                              <Link
                                href="/admin/inventario"
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:text-indigo-700 transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                <Pencil className="h-3 w-3" />
                                Editar
                              </Link>
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && hasVariants && (
                        <VariantSubTable key={`${p.id}-variants`} product={p} isAdmin={isAdmin} />
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
