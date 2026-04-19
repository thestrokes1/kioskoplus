'use client'

import { X, Trash2, ShoppingBag, Zap, XCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export function Cart() {
  const { items, removeItem, removePromo, updateCantidad, total, cantidadTotal } = useCartStore()
  const { cartOpen, closeCart, openCheckout } = useUiStore()

  if (!cartOpen) return null

  // Separate regular vs promo items and group promos by label
  const regularItems = items.filter((i) => !i.promo_label)
  const promoLabels = Array.from(new Set(items.filter((i) => i.promo_label).map((i) => i.promo_label!)))
  const promoGroups = promoLabels.map((label) => ({
    label,
    items: items.filter((i) => i.promo_label === label),
  }))

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={closeCart} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Carrito</h2>
            {cantidadTotal() > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {cantidadTotal()}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {/* ── Promo groups ────────────────────────────────────────── */}
              {promoGroups.map(({ label, items: promoItems }) => {
                const promoTotal = promoItems.reduce(
                  (a, i) => a + (i.precio_manual ?? i.product.precio + (i.variant?.precio_extra ?? 0)) * i.cantidad,
                  0
                )
                const promoOriginal = promoItems.reduce(
                  (a, i) => a + (i.product.precio + (i.variant?.precio_extra ?? 0)) * i.cantidad,
                  0
                )
                const ahorroPromo = promoOriginal - promoTotal
                // Extract pct from label (format: "🎉 #N Nombre | 15% OFF" or "🎉 #N Nombre")
                return (
                  <div
                    key={label}
                    className="overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800"
                  >
                    {/* Promo group header */}
                    <div className="flex items-center justify-between bg-indigo-600 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className="h-4 w-4 shrink-0 text-indigo-200" />
                        <span className="text-sm font-bold text-white truncate">{label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <div className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white">
                          Ahorrás {fmt(ahorroPromo)}
                        </div>
                        <button
                          onClick={() => removePromo(label)}
                          title="Quitar promo completa"
                          className="rounded-full p-0.5 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Promo items */}
                    <div className="divide-y divide-indigo-50 dark:divide-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-900/10">
                      {promoItems.map((item) => {
                        const precioUnit = item.precio_manual != null
                          ? item.precio_manual
                          : item.product.precio + (item.variant?.precio_extra ?? 0)
                        const precioOrigUnit = item.product.precio + (item.variant?.precio_extra ?? 0)
                        const subtotal = precioUnit * item.cantidad
                        const itemKey = `${item.product.id}-${item.variant?.id ?? 'base'}-${label}`

                        return (
                          <div key={itemKey} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="shrink-0 text-xl leading-none">{item.product.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                                {item.product.nombre}
                                {item.variant && (
                                  <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                                    ({item.variant.nombre})
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                                  {fmt(precioUnit)}
                                </span>
                                {precioOrigUnit !== precioUnit && (
                                  <span className="text-[10px] text-gray-400 line-through">
                                    {fmt(precioOrigUnit)}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400">c/u</span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                onClick={() => updateCantidad(item.product.id, item.variant?.id ?? null, item.cantidad - 1, item.promo_label)}
                                className="flex h-6 w-6 items-center justify-center rounded border border-indigo-200 dark:border-indigo-700 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                              >
                                −
                              </button>
                              <span className="w-5 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => updateCantidad(item.product.id, item.variant?.id ?? null, item.cantidad + 1, item.promo_label)}
                                className="flex h-6 w-6 items-center justify-center rounded border border-indigo-200 dark:border-indigo-700 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                {fmt(subtotal)}
                              </p>
                              <button
                                onClick={() => removeItem(item.product.id, item.variant?.id ?? null, item.promo_label)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Promo subtotal */}
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 border-t border-indigo-100 dark:border-indigo-800/50">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="line-through">{fmt(promoOriginal)}</span>
                        <span className="text-gray-300 dark:text-gray-600">→</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">{fmt(promoTotal)}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        −{fmt(ahorroPromo)}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* ── Regular items ────────────────────────────────────────── */}
              {regularItems.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {regularItems.map((item) => {
                    const precioUnit = item.product.precio + (item.variant?.precio_extra ?? 0)
                    const subtotal = precioUnit * item.cantidad
                    const itemKey = `${item.product.id}-${item.variant?.id ?? 'base'}-regular`

                    return (
                      <li
                        key={itemKey}
                        className="flex gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/40 p-3"
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700 text-2xl">
                          {item.product.emoji}
                        </div>

                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                            {item.product.nombre}
                            {item.variant && (
                              <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                                ({item.variant.nombre})
                              </span>
                            )}
                          </p>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {fmt(precioUnit)} c/u
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              onClick={() => updateCantidad(item.product.id, item.variant?.id ?? null, item.cantidad - 1, item.promo_label)}
                              className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => updateCantidad(item.product.id, item.variant?.id ?? null, item.cantidad + 1, item.promo_label)}
                              className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {fmt(subtotal)}
                          </p>
                          <button
                            onClick={() => removeItem(item.product.id, item.variant?.id ?? null, item.promo_label)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
            {/* Total savings line */}
            {promoGroups.length > 0 && (() => {
              const totalAhorro = promoGroups.reduce((acc, { items: promoItems }) => {
                const orig = promoItems.reduce((a, i) => a + (i.product.precio + (i.variant?.precio_extra ?? 0)) * i.cantidad, 0)
                const disc = promoItems.reduce((a, i) => a + (i.precio_manual ?? i.product.precio + (i.variant?.precio_extra ?? 0)) * i.cantidad, 0)
                return acc + (orig - disc)
              }, 0)
              return (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Ahorro total con promos
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    −{fmt(totalAhorro)}
                  </span>
                </div>
              )
            })()}

            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-medium text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(total())}</span>
            </div>
            <Button className="w-full" size="lg" onClick={openCheckout}>
              Finalizar compra
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
