'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, Trash2, X, Tag } from 'lucide-react'
import type { Promo, Product, ProductVariant } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface ItemRow {
  product: Product
  variant: ProductVariant | null
  cantidad: number
  precioUnit: number
}

// ─── Price preview ─────────────────────────────────────────────────────────────

function PricePreview({ items, pct }: { items: ItemRow[]; pct: number }) {
  if (items.length === 0) return null

  const original = items.reduce((acc, i) => acc + i.precioUnit * i.cantidad, 0)
  const ahorro = Math.round(original * pct / 100)
  const final = original - ahorro

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        Resumen de precios
      </p>
      <div className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>
              {item.product.emoji} {item.product.nombre}
              {item.variant ? ` — ${item.variant.nombre}` : ''}
              {item.cantidad > 1 ? ` x${item.cantidad}` : ''}
            </span>
            <span>{fmt(item.precioUnit * item.cantidad)}</span>
          </div>
        ))}
        <div className="border-t border-indigo-200 dark:border-indigo-700 pt-1.5 flex justify-between text-gray-700 dark:text-gray-300">
          <span>Subtotal</span>
          <span className="line-through text-gray-400">{fmt(original)}</span>
        </div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
          <span>Descuento {pct}%</span>
          <span>− {fmt(ahorro)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-indigo-700 dark:text-indigo-300 border-t border-indigo-200 dark:border-indigo-700 pt-1.5">
          <span>PRECIO COMBO</span>
          <span>{fmt(final)}</span>
        </div>
        <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 font-semibold">
          Cliente ahorra {fmt(ahorro)} ({pct}% OFF)
        </p>
      </div>
    </div>
  )
}

// ─── Product search row ────────────────────────────────────────────────────────

function ProductSearchRow({
  products,
  onAdd,
}: {
  products: Product[]
  onAdd: (item: ItemRow) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? products.filter((p) =>
        p.nombre.toLowerCase().includes(query.toLowerCase()) ||
        (p.marca?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : products.slice(0, 12)

  function pick(p: Product) {
    setSelected(p)
    setVariant(null)
    setQuery(p.nombre)
    setOpen(false)
  }

  function addItem() {
    if (!selected) return
    const precioUnit = variant?.precio_variante ?? selected.precio
    onAdd({ product: selected, variant, cantidad, precioUnit })
    setSelected(null)
    setVariant(null)
    setQuery('')
    setCantidad(1)
  }

  const activeVariants = selected
    ? (selected.product_variants ?? []).filter((v) => v.activo && v.stock > 0)
    : []

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="space-y-2">
      <div ref={ref} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelected(null) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar producto por nombre o marca…"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => pick(p)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  <span className="text-xl leading-none">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.nombre}</p>
                    {p.marca && <p className="text-xs text-gray-400">{p.marca}</p>}
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 shrink-0">
                    {fmt(p.precio)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variant + qty + add */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          {activeVariants.length > 0 && (
            <select
              value={variant?.id ?? ''}
              onChange={(e) => {
                const v = activeVariants.find((v) => v.id === e.target.value) ?? null
                setVariant(v)
              }}
              className="flex-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">Sin variante (base {fmt(selected.precio)})</option>
              {activeVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} — {fmt(v.precio_variante ?? selected.precio)}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => c + 1)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main form ─────────────────────────────────────────────────────────────────

interface PromoFormProps {
  promo?: Promo
  onSuccess: () => void
  onCancel: () => void
}

export function PromoForm({ promo, onSuccess, onCancel }: PromoFormProps) {
  const [nombre, setNombre] = useState(promo?.nombre ?? '')
  const [emoji, setEmoji] = useState(promo?.emoji ?? '🎉')
  const [descripcion, setDescripcion] = useState(promo?.descripcion ?? '')
  const [pctDescuento, setPctDescuento] = useState<number>(promo?.pct_descuento ?? 15)
  const [activo, setActivo] = useState(promo?.activo ?? true)
  const [fechaInicio, setFechaInicio] = useState(promo?.fecha_inicio ?? '')
  const [fechaFin, setFechaFin] = useState(promo?.fecha_fin ?? '')
  const [items, setItems] = useState<ItemRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products?activo=true')
    const { data } = (await res.json()) as { data: Product[] }
    setProducts(data ?? [])
  }, [])

  useEffect(() => {
    fetchProducts()
    // Pre-cargar items si editando
    if (promo?.promo_items) {
      const rows: ItemRow[] = promo.promo_items
        .filter((pi) => pi.products)
        .map((pi) => {
          const prod = pi.products!
          const v = pi.product_variants ?? null
          return {
            product: prod,
            variant: v,
            cantidad: pi.cantidad,
            precioUnit: v?.precio_variante ?? prod.precio,
          }
        })
      setItems(rows)
    }
  }, [fetchProducts, promo])

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateCantidad(idx: number, delta: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, cantidad: Math.max(1, item.cantidad + delta) } : item
      )
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length < 2) {
      setError('Necesitás al menos 2 productos para armar una promo')
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      nombre,
      emoji,
      descripcion: descripcion || null,
      pct_descuento: pctDescuento,
      activo,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      items: items.map((i) => ({
        product_id: i.product.id,
        variant_id: i.variant?.id ?? null,
        cantidad: i.cantidad,
      })),
    }

    try {
      const url = promo ? `/api/promos/${promo.id}` : '/api/promos'
      const method = promo ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const { error: apiErr } = (await res.json()) as { data: unknown; error: string | null }
      if (apiErr) { setError(apiErr); return }
      onSuccess()
    } catch {
      setError('Error al guardar la promo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Identificación ──────────────────────────────────────────── */}
      <div className="grid grid-cols-[auto_1fr] gap-3">
        {/* Emoji */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(-2) || '🎉')}
            maxLength={2}
            className="w-16 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-2.5 text-center text-2xl focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        {/* Nombre */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Nombre de la promo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Fernet con Coca, Pack Asado, etc."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Combo perfecto para el asado"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* ── Descuento + Vigencia ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            % Descuento <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              required
              min={1}
              max={100}
              step={0.5}
              value={pctDescuento}
              onChange={(e) => setPctDescuento(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 pr-8 text-sm font-semibold text-indigo-700 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* ── Productos del combo ─────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Productos del combo <span className="text-red-500">*</span>
            <span className="ml-1 text-gray-400">(mínimo 2)</span>
          </label>
          {items.length > 0 && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              {items.length} producto{items.length !== 1 ? 's' : ''} agregado{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Buscador de productos */}
        <ProductSearchRow products={products} onAdd={(item) => setItems((prev) => [...prev, item])} />

        {/* Lista de items */}
        {items.length > 0 && (
          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-3">
                <span className="text-xl leading-none">{item.product.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.product.nombre}
                    {item.variant && <span className="text-gray-400 font-normal"> — {item.variant.nombre}</span>}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">{fmt(item.precioUnit)} c/u</p>
                </div>
                {/* Qty control */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => updateCantidad(idx, -1)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 w-5 text-center"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCantidad(idx, 1)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 w-5 text-center"
                  >
                    +
                  </button>
                </div>
                <p className="w-20 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {fmt(item.precioUnit * item.cantidad)}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Preview de precios ──────────────────────────────────────── */}
      <PricePreview items={items} pct={pctDescuento} />

      {/* ── Activo ─────────────────────────────────────────────────── */}
      <label className="flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <div className={`h-5 w-9 rounded-full transition-colors ${activo ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-4' : ''}`} />
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Promo activa (visible en tienda y POS)
        </span>
      </label>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── Acciones ───────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-200 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Tag className="h-4 w-4" />
          )}
          {saving ? 'Guardando…' : promo ? 'Guardar cambios' : 'Crear promo'}
        </button>
      </div>
    </form>
  )
}
