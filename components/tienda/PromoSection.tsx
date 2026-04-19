'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Zap, Tag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { calcPromo } from '@/types/index'
import type { Promo, PromoItem } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── PromoCard ────────────────────────────────────────────────────────────────

function PromoCard({ promo }: { promo: Promo }) {
  const addItem = useCartStore((s) => s.addItem)
  const addToast = useUiStore((s) => s.addToast)
  const [added, setAdded] = useState(false)

  const { precioOriginal, precioFinal, ahorro } = calcPromo(promo)
  const items = (promo.promo_items ?? []).filter((pi) => pi.products)

  function handleAdd() {
    items.forEach((pi: PromoItem) => {
      const prod = pi.products!
      const variant = pi.product_variants ?? null
      const precioBase = variant?.precio_variante ?? prod.precio
      const precioConDesc = Math.round(precioBase * (1 - promo.pct_descuento / 100))
      addItem(prod, variant, pi.cantidad, precioConDesc, `🎉 Promo #${promo.numero} — ${promo.nombre}`)
    })
    addToast(`${promo.emoji} ${promo.nombre} agregado al carrito`, 'success')
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">

      {/* Header strip */}
      <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2">
        <span className="text-base leading-none">{promo.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
              Promo #{promo.numero}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{promo.nombre}</span>
          </div>
          {promo.descripcion && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{promo.descripcion}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-black text-white">
          {promo.pct_descuento}% OFF
        </span>
      </div>

      {/* Products list — compact */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {items.map((pi, i) => {
          const prod = pi.products!
          const variant = pi.product_variants
          const precioBase = variant?.precio_variante ?? prod.precio
          return (
            <div key={i} className="flex items-center gap-2.5 px-4 py-2">
              <span className="text-lg leading-none shrink-0">{prod.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  {prod.nombre}
                  {variant && <span className="text-gray-400 font-normal"> — {variant.nombre}</span>}
                  {pi.cantidad > 1 && <span className="text-gray-400 font-normal"> ×{pi.cantidad}</span>}
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {fmt(precioBase * pi.cantidad)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer: price + CTA */}
      <div className="mt-auto flex items-center gap-3 border-t border-indigo-100 dark:border-indigo-800/60 bg-indigo-600 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-indigo-300 line-through leading-none">{fmt(precioOriginal)}</p>
          <p className="text-xl font-black text-white leading-tight">{fmt(precioFinal)}</p>
          <p className="text-[10px] font-semibold text-emerald-300">Ahorrás {fmt(ahorro)}</p>
        </div>
        <button
          onClick={handleAdd}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
            added ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {added ? '¡Agregado! ✓' : 'Agregar'}
        </button>
      </div>

      {/* Validity */}
      {(promo.fecha_inicio || promo.fecha_fin) && (
        <p className="px-4 py-1.5 text-center text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50">
          Vigente{promo.fecha_inicio ? ` desde ${promo.fecha_inicio}` : ''}
          {promo.fecha_fin ? ` hasta ${promo.fecha_fin}` : ''}
        </p>
      )}
    </div>
  )
}

// ─── PromoSection ─────────────────────────────────────────────────────────────

export function PromoSection() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/promos')
      .then((r) => r.json())
      .then(({ data }) => setPromos(data ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-6">
        <div className="mb-3 h-5 w-36 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  if (promos.length === 0) return null

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Promos del día
        </h2>
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
          {promos.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>
    </div>
  )
}
