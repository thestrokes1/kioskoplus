'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PackageX, TrendingDown, AlertTriangle, Package, ChevronDown, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ExportButton } from '@/components/admin/ExportButton'
import { InventoryTable } from '@/components/admin/InventoryTable'
import { ProductForm } from '@/components/admin/ProductForm'
import {
  InventarioTable,
  TableSkeleton,
  FILTROS,
  buildExpiryList,
  applyFilter,
  type FiltroVencimiento,
} from '@/components/shared/InventarioTable'
import type { Product, Category, ProductVariant } from '@/types/index'

// ─── Tipos para by-category ──────────────────────────────────────────────────

interface CategoriaConProductos {
  id: string
  nombre: string
  emoji: string | null
  productos: Array<Product & { product_variants?: ProductVariant[] }>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Estado de variante ────────────────────────────────────────────────────────

function estadoVariante(v: ProductVariant): { label: string; cls: string } {
  if (v.stock === 0) return { label: 'Sin stock', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
  if (v.stock <= (v.stock_minimo ?? 5)) return { label: 'Stock bajo', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
  if (v.fecha_vencimiento) {
    const dias = Math.floor((new Date(v.fecha_vencimiento + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
    if (dias < 0) return { label: 'Vencido', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
    if (dias <= 7) return { label: `Vence en ${dias}d`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
  }
  return { label: 'OK', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' }
}

// ─── Quick stock input (variantes) ────────────────────────────────────────────

function QuickStockVariant({ productId, variantId, onSuccess }: { productId: string; variantId: string; onSuccess: () => void }) {
  const [qty, setQty] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function apply() {
    if (qty <= 0) return
    setSaving(true)
    try {
      await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, variant_id: variantId, cantidad: qty, motivo: 'compra' }),
      })
      setDone(true); setQty(0)
      setTimeout(() => setDone(false), 2000)
      onSuccess()
    } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min="0" value={qty || ''} onChange={(e) => setQty(parseInt(e.target.value) || 0)}
        placeholder="+0"
        className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      <button
        onClick={apply} disabled={saving || qty <= 0}
        className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40'}`}
      >
        {saving ? '…' : done ? '✓' : '+'}
      </button>
    </div>
  )
}

// ─── Vista por categoría ──────────────────────────────────────────────────────

function CategoriaView() {
  const [cats, setCats] = useState<CategoriaConProductos[]>([])
  const [loading, setLoading] = useState(true)
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [openProducts, setOpenProducts] = useState<Set<string>>(new Set())

  const fetchData = () => {
    fetch('/api/products/by-category')
      .then((r) => r.json())
      .then((j) => {
        const data: CategoriaConProductos[] = j.data ?? []
        setCats(data)
        setOpenCats(new Set(data.map((c) => c.id)))
        const withVariants = new Set<string>()
        data.forEach((c) => c.productos.forEach((p) => {
          if ((p.product_variants?.filter((v) => v.activo).length ?? 0) > 0) withVariants.add(p.id)
        }))
        setOpenProducts(withVariants)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  function toggleCat(id: string) {
    setOpenCats((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleProduct(id: string) {
    setOpenProducts((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (cats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
        <p className="text-sm text-gray-400">Sin productos activos</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {cats.map((cat) => {
        const isOpen = openCats.has(cat.id)
        const totalVariants = cat.productos.reduce((acc, p) => acc + (p.product_variants?.filter((v) => v.activo).length ?? 0), 0)
        const totalStock = cat.productos.reduce((acc, p) => {
          const varStock = (p.product_variants?.filter((v) => v.activo) ?? []).reduce((s, v) => s + v.stock, 0)
          return acc + (varStock > 0 ? varStock : p.stock)
        }, 0)

        return (
          <div key={cat.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => toggleCat(cat.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
              <span className="text-xl">{cat.emoji ?? '📦'}</span>
              <span className="flex-1 font-semibold text-gray-900 dark:text-gray-100">{cat.nombre}</span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{cat.productos.length} productos</span>
                {totalVariants > 0 && <span>{totalVariants} variantes</span>}
                <span className="font-medium text-gray-600 dark:text-gray-300">{totalStock} u. en stock</span>
              </div>
            </button>

            {isOpen && (
              <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                {cat.productos.map((p) => {
                  const activeVariants = (p.product_variants ?? []).filter((v) => v.activo)
                  const hasVariants = activeVariants.length > 0
                  const isProdOpen = openProducts.has(p.id)

                  return (
                    <div key={p.id}>
                      <div
                        className={`flex items-center gap-3 px-6 py-3 ${hasVariants ? 'cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/40' : ''}`}
                        onClick={hasVariants ? () => toggleProduct(p.id) : undefined}
                      >
                        {hasVariants ? (
                          isProdOpen
                            ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        ) : (
                          <span className="w-3.5 flex-shrink-0" />
                        )}
                        <span className="text-lg leading-none">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{p.nombre}</span>
                          {p.marca && <span className="ml-2 text-xs text-gray-400">{p.marca}</span>}
                        </div>
                        {!hasVariants && (
                          <>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmt(p.precio)}</span>
                            <span className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= p.stock_minimo ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {p.stock} {p.unidad}
                            </span>
                          </>
                        )}
                        {hasVariants && (
                          <span className="text-xs text-gray-400">
                            {activeVariants.length} variante{activeVariants.length !== 1 ? 's' : ''}
                            {' · '}
                            {activeVariants.reduce((s, v) => s + v.stock, 0)} u. total
                          </span>
                        )}
                      </div>

                      {hasVariants && isProdOpen && (
                        <div className="mx-6 mb-3 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                                <th className="px-3 py-2 text-left font-medium text-gray-500">Variante</th>
                                <th className="hidden px-3 py-2 text-left font-medium text-gray-500 sm:table-cell">Presentación</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-500">Precio</th>
                                <th className="hidden px-3 py-2 text-right font-medium text-gray-500 md:table-cell">Costo</th>
                                <th className="hidden px-3 py-2 text-right font-medium text-gray-500 md:table-cell">Margen</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-500">Stock</th>
                                <th className="hidden px-3 py-2 text-center font-medium text-gray-500 sm:table-cell">Vencimiento</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-500">Estado</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-500">Agregar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                              {activeVariants.map((v) => {
                                const precio = v.precio_variante ?? (p.precio + v.precio_extra)
                                const margen = v.costo_variante && precio > 0
                                  ? ((precio - v.costo_variante) / precio) * 100
                                  : null
                                const estado = estadoVariante(v)
                                return (
                                  <tr key={v.id} className="bg-white hover:bg-gray-50/50 dark:bg-gray-900 dark:hover:bg-gray-800/30">
                                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                                      {v.descripcion_completa ?? v.nombre}
                                    </td>
                                    <td className="hidden px-3 py-2 text-gray-500 dark:text-gray-400 capitalize sm:table-cell">
                                      {v.presentacion
                                        ? `${v.presentacion}${v.capacidad ? ` ${v.capacidad}${v.capacidad_unidad ?? ''}` : ''}`
                                        : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                                      {fmt(precio)}
                                    </td>
                                    <td className="hidden px-3 py-2 text-right text-gray-500 dark:text-gray-400 md:table-cell">
                                      {v.costo_variante ? fmt(v.costo_variante) : '—'}
                                    </td>
                                    <td className="hidden px-3 py-2 text-right md:table-cell">
                                      {margen !== null ? (
                                        <span className={`font-semibold ${margen >= 30 ? 'text-emerald-600' : margen >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                                          {margen.toFixed(0)}%
                                        </span>
                                      ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`font-semibold ${v.stock === 0 ? 'text-red-600' : v.stock <= (v.stock_minimo ?? 5) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {v.stock} u
                                      </span>
                                    </td>
                                    <td className="hidden px-3 py-2 text-center text-gray-500 dark:text-gray-400 sm:table-cell">
                                      {v.fecha_vencimiento ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.cls}`}>
                                        {estado.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <QuickStockVariant productId={p.id} variantId={v.id} onSuccess={fetchData} />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ products }: { products: Product[] }) {
  const activos = products.filter((p) => p.activo).length
  const sinStock = products.filter((p) => p.stock === 0).length
  const stockBajo = products.filter((p) => p.activo && p.stock > 0 && p.stock <= p.stock_minimo).length
  const allExpiryItems = buildExpiryList(products)
  const vencidos = applyFilter(allExpiryItems, 'vencidos').length

  const cards = [
    { label: 'Productos activos', value: activos, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Stock bajo', value: stockBajo, icon: TrendingDown, color: stockBajo > 0 ? 'text-amber-600' : 'text-gray-400', bg: stockBajo > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800' },
    { label: 'Sin stock', value: sinStock, icon: PackageX, color: sinStock > 0 ? 'text-red-600' : 'text-gray-400', bg: sinStock > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800' },
    { label: 'Vencidos', value: vencidos, icon: AlertTriangle, color: vencidos > 0 ? 'text-red-600' : 'text-gray-400', bg: vencidos > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`flex items-center gap-3 rounded-2xl ${c.bg} px-4 py-4`}>
          <div className="rounded-xl bg-white/70 p-2 dark:bg-gray-900/40">
            <c.icon className={`h-5 w-5 ${c.color}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Inner content (needs useSearchParams) ────────────────────────────────────

const VISTAS = [
  { key: 'productos', label: 'Productos' },
  { key: 'vencimientos', label: 'Vencimientos' },
  { key: 'categoria', label: 'Por categoría' },
] as const

type Vista = typeof VISTAS[number]['key']

function AdminInventarioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filtro = (searchParams.get('filtro') as FiltroVencimiento) ?? 'todos'
  const vista = (searchParams.get('vista') as Vista) ?? 'productos'

  // Shared product + category data
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // CRUD modal state
  const [editing, setEditing] = useState<Product | null>(null)
  const [isNew, setIsNew] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/products/categories'),
    ])
    const { data: prods } = (await pRes.json()) as { data: Product[] }
    const { data: cats } = (await cRes.json()) as { data: Category[] }
    setProducts(prods ?? [])
    setCategories(cats ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function setVista(v: Vista) {
    router.push(`/admin/inventario?vista=${v}`)
  }

  function navigateFiltro(key: FiltroVencimiento) {
    router.push(`/admin/inventario?vista=vencimientos&filtro=${key}`)
  }

  function handleSuccess() {
    setEditing(null)
    setIsNew(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    fetchData()
  }

  // Products filtered for expiry views (activos only)
  const activeProducts = products.filter((p) => p.activo)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
        <ExportButton tipo="inventario" label="Exportar" />
      </div>

      {/* Vista tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900 w-fit">
        {VISTAS.map((t) => (
          <button
            key={t.key}
            onClick={() => setVista(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              vista === t.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Productos: gestión completa CRUD ──────────────────────────────── */}
      {vista === 'productos' && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : (
            <SummaryCards products={products} />
          )}

          <InventoryTable
            products={products}
            onEdit={(p) => setEditing(p)}
            onDelete={handleDelete}
            onNew={() => setIsNew(true)}
          />
        </>
      )}

      {/* ── Vencimientos ─────────────────────────────────────────────────── */}
      {vista === 'vencimientos' && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : (
            <SummaryCards products={activeProducts} />
          )}

          <InventarioTable
            products={activeProducts}
            loading={loading}
            filtro={filtro}
            isAdmin={true}
            onNavigate={navigateFiltro}
            onStockChanged={fetchData}
          />
        </>
      )}

      {/* ── Por categoría ─────────────────────────────────────────────────── */}
      {vista === 'categoria' && <CategoriaView />}

      {/* Modal Agregar / Editar producto */}
      <Modal
        open={isNew || !!editing}
        onClose={() => { setEditing(null); setIsNew(false) }}
        title={editing ? `Editar — ${editing.nombre}` : 'Nuevo producto'}
        maxWidth="lg"
      >
        <ProductForm
          product={editing ?? undefined}
          categories={categories}
          onSuccess={handleSuccess}
          onCancel={() => { setEditing(null); setIsNew(false) }}
        />
      </Modal>
    </div>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function AdminInventarioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900 w-fit">
            {FILTROS.map((f) => (
              <div key={f.key} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400">
                {f.label}
              </div>
            ))}
          </div>
          <TableSkeleton />
        </div>
      }
    >
      <AdminInventarioContent />
    </Suspense>
  )
}
