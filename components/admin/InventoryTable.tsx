'use client'

import React, { useState, useEffect } from 'react'
import { Edit, Trash2, Plus, ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Product } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface InventoryTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onNew: () => void
}

function AdminVariantSubTable({ product }: { product: Product }) {
  const initial = (product.product_variants ?? []).filter((v) => v.activo)
  const [variants, setVariants] = useState(initial)
  const [adjusting, setAdjusting] = useState<Set<string>>(new Set())
  const [amounts, setAmounts] = useState<Map<string, number>>(new Map())

  if (variants.length === 0) return null

  async function adjustVariantStock(variantId: string, delta: number) {
    setVariants((prev) =>
      prev.map((v) => v.id === variantId ? { ...v, stock: Math.max(0, v.stock + delta) } : v)
    )
    setAdjusting((prev) => new Set([...prev, variantId]))
    try {
      const res = await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          variant_id: variantId,
          cantidad: delta,
          motivo: 'ajuste manual',
        }),
      })
      const json = (await res.json()) as { error: string | null }
      if (json.error) setVariants(initial)
    } catch {
      setVariants(initial)
    } finally {
      setAdjusting((prev) => { const n = new Set(prev); n.delete(variantId); return n })
    }
  }

  return (
    <tr>
      <td colSpan={9} className="bg-gray-50/80 px-4 pb-3 dark:bg-gray-800/60">
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Variante</th>
                <th className="hidden px-3 py-2 text-left font-medium text-gray-500 sm:table-cell">Presentación</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Precio</th>
                <th className="hidden px-3 py-2 text-right font-medium text-gray-500 lg:table-cell">Costo</th>
                <th className="hidden px-3 py-2 text-right font-medium text-gray-500 lg:table-cell">Margen</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Stock</th>
                <th className="hidden px-3 py-2 text-center font-medium text-gray-500 sm:table-cell">Vencimiento</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Estado</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {variants.map((v) => {
                const precio = v.precio_variante ?? (product.precio + v.precio_extra)
                const margen = v.costo_variante && precio > 0
                  ? ((precio - v.costo_variante) / precio) * 100
                  : null
                const stockLow = v.stock <= (v.stock_minimo ?? 5)
                const isAdjusting = adjusting.has(v.id)
                const amount = amounts.get(v.id) ?? 1

                return (
                  <tr key={v.id} className="bg-white dark:bg-gray-900">
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                      {v.descripcion_completa ?? v.nombre}
                    </td>
                    <td className="hidden px-3 py-2 text-gray-500 capitalize dark:text-gray-400 sm:table-cell">
                      {v.presentacion ?? '—'}{v.capacidad ? ` ${v.capacidad}${v.capacidad_unidad ?? ''}` : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(precio)}</td>
                    <td className="hidden px-3 py-2 text-right text-gray-500 dark:text-gray-400 lg:table-cell">
                      {v.costo_variante ? fmt(v.costo_variante) : '—'}
                    </td>
                    <td className="hidden px-3 py-2 text-right lg:table-cell">
                      {margen !== null ? (
                        <span className={`font-semibold ${margen >= 30 ? 'text-emerald-600' : margen >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                          {margen.toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-semibold ${v.stock === 0 ? 'text-red-600' : stockLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {v.stock}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-center text-gray-500 dark:text-gray-400 sm:table-cell">
                      {v.fecha_vencimiento ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {v.stock === 0 ? (
                        <Badge variant="danger">Sin stock</Badge>
                      ) : stockLow ? (
                        <Badge variant="warning">Stock bajo</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          disabled={isAdjusting || v.stock === 0}
                          onClick={() => adjustVariantStock(v.id, -amount)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:hover:bg-red-900/20"
                          title="Restar del stock"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={amount}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1)
                            setAmounts((prev) => new Map(prev).set(v.id, val))
                          }}
                          className="w-10 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        />
                        <button
                          disabled={isAdjusting}
                          onClick={() => adjustVariantStock(v.id, +amount)}
                          className="rounded p-1 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:hover:bg-emerald-900/20"
                          title="Sumar al stock"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
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

export function InventoryTable({ products, onEdit, onDelete, onNew }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [localProducts, setLocalProducts] = useState<Product[]>(products)
  const [adjustingStock, setAdjustingStock] = useState<Set<string>>(new Set())
  const [adjustAmounts, setAdjustAmounts] = useState<Map<string, number>>(new Map())

  // Sync when parent re-fetches
  useEffect(() => {
    setLocalProducts(products)
  }, [products])

  const filtered = localProducts.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function adjustStock(productId: string, delta: number) {
    // Optimistic update
    setLocalProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p
      )
    )
    setAdjustingStock((prev) => new Set([...prev, productId]))

    try {
      const res = await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          cantidad: delta,
          motivo: 'ajuste manual',
        }),
      })
      const json = (await res.json()) as { error: string | null }
      if (json.error) {
        // Revert on error
        setLocalProducts(products)
      }
    } catch {
      setLocalProducts(products)
    } finally {
      setAdjustingStock((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <span className="hidden sm:inline shrink-0 text-sm text-gray-500 dark:text-gray-400">
            {search
              ? `${filtered.length} de ${localProducts.length} producto${localProducts.length !== 1 ? 's' : ''}`
              : `${localProducts.length} producto${localProducts.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <Button onClick={onNew} size="sm">
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Producto</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">Presentación</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Precio</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium text-gray-500 lg:table-cell">Costo</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium text-gray-500 lg:table-cell">Margen</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Stock</th>
                <th className="hidden px-4 py-3 text-center text-xs font-medium text-gray-500 md:table-cell">Vencimiento</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((p) => {
                const hasVariants = (p.product_variants ?? []).filter((v) => v.activo).length > 0
                const isExpanded = expandedRows.has(p.id)
                const margen = p.costo_unitario && p.precio > 0
                  ? ((p.precio - p.costo_unitario) / p.precio) * 100
                  : null
                const stockLow = p.stock <= p.stock_minimo
                const isAdjusting = adjustingStock.has(p.id)

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${hasVariants ? 'cursor-pointer' : ''}`}
                      onClick={hasVariants ? (e) => { e.stopPropagation(); toggleRow(p.id) } : undefined}
                    >
                      {/* Producto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasVariants ? (
                            isExpanded
                              ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          ) : (
                            <span className="w-4 flex-shrink-0" />
                          )}
                          <span className="text-xl">{p.emoji}</span>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{p.nombre}</span>
                            {p.marca && (
                              <p className="text-xs text-gray-400">{p.marca}</p>
                            )}
                            {hasVariants && (
                              <p className="text-xs text-gray-400">{(p.product_variants ?? []).filter((v) => v.activo).length} variantes</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Presentación */}
                      <td className="hidden px-4 py-3 text-sm text-gray-500 dark:text-gray-400 sm:table-cell">
                        {p.unidad}
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {fmt(p.precio)}
                      </td>

                      {/* Costo */}
                      <td className="hidden px-4 py-3 text-right text-gray-500 dark:text-gray-400 lg:table-cell">
                        {p.costo_unitario ? fmt(p.costo_unitario) : '—'}
                      </td>

                      {/* Margen */}
                      <td className="hidden px-4 py-3 text-right lg:table-cell">
                        {margen !== null ? (
                          <span className={`font-semibold ${margen >= 30 ? 'text-emerald-600' : margen >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {margen.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : stockLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {p.stock} {p.unidad}
                        </span>
                      </td>

                      {/* Vencimiento */}
                      <td className="hidden px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400 md:table-cell">
                        {p.fecha_vencimiento ?? '—'}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        {p.activo ? <Badge variant="success">OK</Badge> : <Badge variant="default">Inactivo</Badge>}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Stock -/+ con input de cantidad */}
                          <button
                            disabled={isAdjusting || p.stock === 0}
                            onClick={() => adjustStock(p.id, -(adjustAmounts.get(p.id) ?? 1))}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:hover:bg-red-900/20"
                            title="Restar del stock"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={adjustAmounts.get(p.id) ?? 1}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1)
                              setAdjustAmounts((prev) => new Map(prev).set(p.id, val))
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-12 rounded border border-gray-200 bg-white px-1.5 py-1 text-center text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          />
                          <button
                            disabled={isAdjusting}
                            onClick={() => adjustStock(p.id, +(adjustAmounts.get(p.id) ?? 1))}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors dark:hover:bg-emerald-900/20"
                            title="Sumar al stock"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>

                          <div className="mx-0.5 h-4 w-px bg-gray-200 dark:bg-gray-700" />

                          <button
                            onClick={() => onEdit(p)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors dark:hover:bg-gray-700"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(p.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && hasVariants && (
                      <AdminVariantSubTable key={`${p.id}-v`} product={p} />
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">Sin productos</p>
        )}
      </div>
    </div>
  )
}
