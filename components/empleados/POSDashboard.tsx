'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  X,
  Printer,
  ShoppingCart,
  ChevronRight,
  Zap,
  ScanBarcode,
} from 'lucide-react'
import type { Product, ProductVariant, Category, Promo } from '@/types/index'
import { calcPromo, variantLabel } from '@/types/index'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'

const PROMO_TAB = '__promos__'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  product: Product
  variant: ProductVariant | null
  cantidad: number
  precio_unitario: number
  promo_label?: string
}

interface Receipt {
  id: string
  items: CartItem[]
  total: number
  metodo_pago: string
  montoRecibido?: number
  vuelto?: number
  created_at: string
  empleadoNombre: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)

function isOutOfStock(p: Product) {
  const variantStock = (p.product_variants ?? []).some((v) => v.activo && v.stock > 0)
  return p.stock === 0 && !variantStock
}

// ─── Variant picker modal ─────────────────────────────────────────────────────

function VariantPicker({
  product,
  onSelect,
  onClose,
}: {
  product: Product
  onSelect: (variant: ProductVariant | null) => void
  onClose: () => void
}) {
  const variants = (product.product_variants ?? []).filter((v) => v.activo && v.stock > 0)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {product.emoji} {product.nombre}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {variants.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Sin variantes con stock disponible</p>
          ) : (
            variants.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 text-left hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-500 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{variantLabel(v)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {v.stock}</p>
                </div>
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                  {fmt(v.precio_variante ?? product.precio)}
                </p>
              </button>
            ))
          )}
          {product.stock > 0 && (
            <button
              onClick={() => onSelect(null)}
              className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 text-left hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-500 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sin variante (base)</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {product.stock}</p>
              </div>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{fmt(product.precio)}</p>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Receipt modal ────────────────────────────────────────────────────────────

function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Venta registrada</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono">
          <div className="mb-3 text-center">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">🏪 KioskoPlus</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(receipt.created_at).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Vendedor: {receipt.empleadoNombre}</p>
          </div>
          <div className="mb-3 border-t border-dashed border-gray-300 dark:border-gray-600 pt-3">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="flex-1 truncate">
                  {item.product.emoji} {item.product.nombre}
                  {item.variant && ` — ${variantLabel(item.variant)}`} x{item.cantidad}
                  {item.promo_label && (
                    <span className="block text-[9px] text-indigo-500 dark:text-indigo-400">
                      {item.promo_label}
                    </span>
                  )}
                </span>
                <span className="shrink-0">{fmt(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-3">
            <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100">
              <span>TOTAL</span>
              <span>{fmt(receipt.total)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Método</span>
              <span className="capitalize">{receipt.metodo_pago}</span>
            </div>
            {receipt.montoRecibido !== undefined && (
              <>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Recibido</span>
                  <span>{fmt(receipt.montoRecibido)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Vuelto</span>
                  <span>{fmt(receipt.vuelto ?? 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onClick,
}: {
  product: Product
  onClick: () => void
}) {
  const outOfStock = isOutOfStock(product)
  const hasVariants = (product.product_variants ?? []).filter((v) => v.activo).length > 0

  return (
    <button
      onClick={onClick}
      disabled={outOfStock}
      className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all active:scale-95 ${
        outOfStock
          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900'
          : 'cursor-pointer border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20'
      }`}
    >
      <span className="text-2xl leading-none">{product.emoji}</span>
      <p className="line-clamp-2 text-xs font-medium leading-tight text-gray-800 dark:text-gray-200">
        {product.nombre}
      </p>
      {product.marca && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5 truncate w-full text-center">
          {product.marca}
        </p>
      )}
      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{fmt(product.precio)}</p>
      {outOfStock ? (
        <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">Sin stock</span>
      ) : hasVariants ? (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
          variantes <ChevronRight className="h-2.5 w-2.5" />
        </span>
      ) : (
        <span className="text-[10px] text-gray-300 dark:text-gray-600">stock: {product.stock}</span>
      )}
    </button>
  )
}

// ─── Cart content (reusable in both sidebar and mobile sheet) ─────────────────

function CartContent({
  cart,
  updateQty,
  clearCart,
  metodo,
  setMetodo,
  montoRecibido,
  setMontoRecibido,
  total,
  vuelto,
  processing,
  onConfirm,
  onClose,
}: {
  cart: CartItem[]
  updateQty: (idx: number, delta: number) => void
  clearCart: () => void
  metodo: 'efectivo' | 'mercadopago' | 'transferencia'
  setMetodo: (m: 'efectivo' | 'mercadopago' | 'transferencia') => void
  montoRecibido: string
  setMontoRecibido: (v: string) => void
  total: number
  vuelto: number | null
  processing: boolean
  onConfirm: () => void
  onClose?: () => void
}) {
  return (
    <>
      {/* Cart header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <ShoppingCart className="h-4 w-4" />
          Carrito
          {cart.length > 0 && (
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {cart.reduce((a, i) => a + i.cantidad, 0)}
            </span>
          )}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <ShoppingCart className="h-10 w-10 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Tocá un producto para agregarlo
            </p>
          </div>
        ) : (() => {
          // Group items: promo groups first, then regular
          const regularItems = cart.filter((i) => !i.promo_label)
          const promoLabels = Array.from(new Set(cart.filter((i) => i.promo_label).map((i) => i.promo_label!)))
          const promoGroups = promoLabels.map((label) => ({
            label,
            indices: cart.reduce<number[]>((acc, item, idx) => {
              if (item.promo_label === label) acc.push(idx)
              return acc
            }, []),
            items: cart.filter((i) => i.promo_label === label),
          }))

          return (
            <div className="p-2 space-y-2">
              {/* Promo groups */}
              {promoGroups.map(({ label, indices, items: promoItems }) => {
                const promoTotal = promoItems.reduce((a, i) => a + i.precio_unitario * i.cantidad, 0)
                const originalTotal = promoItems.reduce(
                  (a, i) => a + (i.variant?.precio_variante ?? i.product.precio) * i.cantidad,
                  0
                )
                const ahorro = originalTotal - promoTotal
                return (
                  <div key={label} className="overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800">
                    {/* Promo header */}
                    <div className="flex items-center justify-between bg-indigo-600 px-3 py-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                        <Zap className="h-3 w-3 shrink-0 text-indigo-200" />
                        {label}
                      </span>
                      <span className="shrink-0 ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        −{fmt(ahorro)}
                      </span>
                    </div>
                    {/* Promo items */}
                    <div className="divide-y divide-indigo-50 dark:divide-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-900/10">
                      {promoItems.map((item, i) => {
                        const idx = indices[i]
                        const precioOrig = item.variant?.precio_variante ?? item.product.precio
                        return (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2">
                            <span className="shrink-0 text-base leading-none">{item.product.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                                {item.product.nombre}
                                {item.variant && <span className="text-gray-400"> — {variantLabel(item.variant)}</span>}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                  {fmt(item.precio_unitario)}
                                </span>
                                {precioOrig !== item.precio_unitario && (
                                  <span className="text-[10px] text-gray-400 line-through">{fmt(precioOrig)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button onClick={() => updateQty(idx, -1)} className="flex h-6 w-6 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">{item.cantidad}</span>
                              <button onClick={() => updateQty(idx, 1)} className="flex h-6 w-6 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                                <Plus className="h-3 w-3" />
                              </button>
                              <button onClick={() => updateQty(idx, -item.cantidad)} className="ml-1 rounded p-0.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Regular items */}
              {regularItems.length > 0 && (
                <div className="divide-y divide-gray-50 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {regularItems.map((item) => {
                    const idx = cart.indexOf(item)
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-900">
                        <span className="shrink-0 text-lg leading-none">{item.product.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                            {item.product.nombre}
                          </p>
                          {item.variant && (
                            <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">{variantLabel(item.variant)}</p>
                          )}
                          <p className="text-xs text-indigo-600 dark:text-indigo-400">{fmt(item.precio_unitario)} c/u</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => updateQty(idx, -1)} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">{item.cantidad}</span>
                          <button onClick={() => updateQty(idx, 1)} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={() => updateQty(idx, -item.cantidad)} className="ml-1 rounded p-0.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Payment section */}
      {cart.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          {/* Promo savings summary */}
          {cart.some((i) => i.promo_label) && (() => {
            const promoLabels = Array.from(new Set(cart.filter((i) => i.promo_label).map((i) => i.promo_label!)))
            const totalAhorro = promoLabels.reduce((acc, label) => {
              const promoItems = cart.filter((i) => i.promo_label === label)
              const orig = promoItems.reduce((a, i) => a + (i.variant?.precio_variante ?? i.product.precio) * i.cantidad, 0)
              const disc = promoItems.reduce((a, i) => a + i.precio_unitario * i.cantidad, 0)
              return acc + (orig - disc)
            }, 0)
            return (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Zap className="h-3.5 w-3.5" />
                  Ahorro con promos
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">−{fmt(totalAhorro)}</span>
              </div>
            )
          })()}
          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</span>
          </div>

          {/* Método de pago */}
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'efectivo', label: '💵 Efectivo' },
                { id: 'mercadopago', label: '📱 MP' },
                { id: 'transferencia', label: '🏦 Transfer.' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMetodo(id)}
                className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  metodo === id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Monto recibido (solo efectivo) */}
          {metodo === 'efectivo' && (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                Monto recibido
              </label>
              <input
                type="number"
                min={total}
                step="50"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                placeholder={String(Math.ceil(total / 50) * 50)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {vuelto !== null && vuelto >= 0 && (
                <p className="mt-1.5 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>Vuelto</span>
                  <span>{fmt(vuelto)}</span>
                </p>
              )}
              {vuelto !== null && vuelto < 0 && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">Monto insuficiente</p>
              )}
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={onConfirm}
            disabled={
              processing ||
              (metodo === 'efectivo' && (parseFloat(montoRecibido) || 0) < total)
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors active:scale-[0.98]"
          >
            {processing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {processing ? 'Procesando…' : 'Confirmar venta'}
          </button>

          <button
            onClick={clearCart}
            className="w-full rounded-xl py-1.5 text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
          >
            Limpiar carrito
          </button>
        </div>
      )}
    </>
  )
}

// ─── POS Promo card ───────────────────────────────────────────────────────────

function POSPromoCard({
  promo,
  onAdd,
}: {
  promo: Promo
  onAdd: (promo: Promo) => void
}) {
  const { precioOriginal, precioFinal, ahorro } = calcPromo(promo)
  const items = (promo.promo_items ?? []).filter((pi) => pi.products)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2.5">
        <span className="text-lg leading-none">{promo.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Promo #{promo.numero}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{promo.nombre}</p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
          {promo.pct_descuento}% OFF
        </span>
      </div>
      {/* Items */}
      <div className="flex-1 divide-y divide-gray-50 dark:divide-gray-700/50">
        {items.map((pi, i) => {
          const prod = pi.products!
          const v = pi.product_variants
          return (
            <div key={i} className="flex items-center gap-2 px-4 py-2">
              <span className="text-base leading-none">{prod.emoji}</span>
              <span className="flex-1 min-w-0 truncate text-xs text-gray-700 dark:text-gray-300">
                {prod.nombre}{v ? ` — ${variantLabel(v)}` : ''}{pi.cantidad > 1 ? ` ×${pi.cantidad}` : ''}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {fmt((v?.precio_variante ?? prod.precio) * pi.cantidad)}
              </span>
            </div>
          )
        })}
      </div>
      {/* Price + button */}
      <div className="border-t border-indigo-100 dark:border-indigo-800/50 bg-indigo-600 px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p className="text-[10px] text-indigo-300 line-through">{fmt(precioOriginal)}</p>
            <p className="text-lg font-black text-white">{fmt(precioFinal)}</p>
          </div>
          <div className="rounded-lg bg-emerald-500 px-2.5 py-1 text-center">
            <p className="text-[9px] font-bold text-white uppercase">Ahorrás</p>
            <p className="text-sm font-bold text-white">{fmt(ahorro)}</p>
          </div>
        </div>
        <button
          onClick={() => onAdd(promo)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 active:scale-[0.98] transition-all"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Agregar combo
        </button>
      </div>
    </div>
  )
}

// ─── Category tabs ────────────────────────────────────────────────────────────

function CategoryTabs({
  categories,
  selected,
  hasPromos,
  onSelect,
}: {
  categories: Category[]
  selected: string | null
  hasPromos: boolean
  onSelect: (id: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Special Promos tab */}
      {hasPromos && (
        <button
          onClick={() => onSelect(selected === PROMO_TAB ? null : PROMO_TAB)}
          className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            selected === PROMO_TAB
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60'
          }`}
        >
          <Zap className="h-3 w-3" />
          Promos
        </button>
      )}
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          selected === null
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
      >
        Todas
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            selected === cat.id
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {cat.emoji && <span>{cat.emoji}</span>}
          <span>{cat.nombre}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  )
}

// ─── Main POS component ───────────────────────────────────────────────────────

export function POSDashboard({
  empleadoId,
  empleadoNombre,
}: {
  empleadoId: string
  empleadoNombre: string
}) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [search, setSearch] = useState('')
  const [displaySearch, setDisplaySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false) // mobile sheet
  const [variantFor, setVariantFor] = useState<Product | null>(null)
  const [metodo, setMetodo] = useState<'efectivo' | 'mercadopago' | 'transferencia'>('efectivo')
  const [montoRecibido, setMontoRecibido] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)

  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Scanner feedback state ────────────────────────────────────────────────
  const [scanToast, setScanToast] = useState<{ ok: boolean; msg: string } | null>(null)
  const scanToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch products + promos on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/products?activo=true').then((r) => r.json()),
      fetch('/api/promos').then((r) => r.json()),
    ]).then(([prodRes, promoRes]) => {
      setProducts(prodRes.data ?? [])
      setPromos(promoRes.data ?? [])
    }).finally(() => setLoadingProducts(false))
  }, [])

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Debounced search
  const handleSearchChange = useCallback((val: string) => {
    setDisplaySearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(val), 300)
  }, [])

  // ── Barcode scanner (USB HID) ─────────────────────────────────────────────

  const showScanToast = useCallback((ok: boolean, msg: string) => {
    if (scanToastTimer.current) clearTimeout(scanToastTimer.current)
    setScanToast({ ok, msg })
    scanToastTimer.current = setTimeout(() => setScanToast(null), 2500)
  }, [])

  function handleBarcodeScan(code: string) {
    // Clear the search input immediately
    handleSearchChange('')

    // 1. Match by product-level barcode
    const byProduct = products.find((p) => p.activo && p.barcode === code)
    if (byProduct) {
      const activeVariants = (byProduct.product_variants ?? []).filter(
        (v) => v.activo && v.stock > 0
      )
      if (activeVariants.length > 0) {
        setVariantFor(byProduct) // let user pick variant
      } else {
        addToCart(byProduct, null)
      }
      showScanToast(true, `${byProduct.emoji} ${byProduct.nombre}`)
      return
    }

    // 2. Match by variant-level barcode (adds specific variant directly)
    for (const p of products) {
      if (!p.activo) continue
      const v = (p.product_variants ?? []).find(
        (v) => v.activo && v.stock > 0 && v.barcode === code
      )
      if (v) {
        addToCart(p, v)
        showScanToast(true, `${p.emoji} ${p.nombre} — ${v.nombre}`)
        return
      }
    }

    // 3. Not found — show error and put code into search for manual lookup
    showScanToast(false, `Sin resultado: ${code}`)
    handleSearchChange(code)
  }

  // Disabled while receipt modal or variant picker is open
  useBarcodeScanner(handleBarcodeScan, !receipt && !variantFor)

  // ── Derived data ──────────────────────────────────────────────────────────

  // Extract unique categories from products (sorted)
  const categories = useMemo<Category[]>(() => {
    const seen = new Map<string, Category>()
    for (const p of products) {
      if (p.categories && !seen.has(p.categories.id)) {
        seen.set(p.categories.id, p.categories)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [products])

  // Filter products based on search or selected category
  const filteredProducts = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return products.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.marca?.toLowerCase().includes(q) ?? false) ||
          (p.barcode?.includes(search) ?? false)
      )
    }
    if (selectedCategory) {
      return products.filter((p) => p.category_id === selectedCategory)
    }
    return products
  }, [products, search, selectedCategory])

  // When "Todas" and no search: group by category
  const groupedByCategory = useMemo(() => {
    if (search.trim() || selectedCategory) return null
    const groups = new Map<string, { category: Category; products: Product[] }>()
    for (const p of products) {
      if (!p.categories) continue
      const key = p.categories.id
      if (!groups.has(key)) {
        groups.set(key, { category: p.categories, products: [] })
      }
      groups.get(key)!.products.push(p)
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.category.nombre.localeCompare(b.category.nombre)
    )
  }, [products, search, selectedCategory])

  // Cart totals
  const total = cart.reduce((a, item) => a + item.precio_unitario * item.cantidad, 0)
  const cartCount = cart.reduce((a, i) => a + i.cantidad, 0)
  const vuelto =
    metodo === 'efectivo' && montoRecibido ? parseFloat(montoRecibido) - total : null

  // ── Cart actions ──────────────────────────────────────────────────────────

  function addPromoToCart(promo: Promo) {
    const { precioFinal, precioOriginal } = calcPromo(promo)
    const descuento = precioOriginal > 0 ? 1 - precioFinal / precioOriginal : 0
    const label = `🎉 Promo #${promo.numero} — ${promo.nombre}`
    ;(promo.promo_items ?? []).forEach((pi) => {
      const prod = pi.products
      if (!prod) return
      const variant = pi.product_variants ?? null
      const precioBase = variant?.precio_variante ?? prod.precio
      const precioConDesc = Math.round(precioBase * (1 - descuento))
      const key = `${prod.id}-${variant?.id ?? 'base'}`
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => `${i.product.id}-${i.variant?.id ?? 'base'}` === key && i.promo_label === label
        )
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + pi.cantidad }
          return updated
        }
        return [...prev, {
          product: prod as Product,
          variant: variant as ProductVariant | null,
          cantidad: pi.cantidad,
          precio_unitario: precioConDesc,
          promo_label: label,
        }]
      })
    })
    setSelectedCategory(null)
  }

  function addToCart(product: Product, variant: ProductVariant | null, cantidadExtra = 1) {
    setVariantFor(null)
    const precio = variant?.precio_variante ?? product.precio
    const key = `${product.id}-${variant?.id ?? 'base'}`
    setCart((prev) => {
      // Solo fusiona con items SIN promo_label (items regulares)
      // Items de promo siempre son líneas separadas con su precio descontado
      const idx = prev.findIndex(
        (i) => `${i.product.id}-${i.variant?.id ?? 'base'}` === key && !i.promo_label
      )
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + cantidadExtra }
        return updated
      }
      return [...prev, { product, variant, cantidad: cantidadExtra, precio_unitario: precio }]
    })
  }

  function handleProductClick(product: Product) {
    const variants = (product.product_variants ?? []).filter((v) => v.activo && v.stock > 0)
    if (variants.length > 0) {
      setVariantFor(product)
    } else {
      addToCart(product, null)
    }
  }

  function updateQty(idx: number, delta: number) {
    setCart((prev) => {
      const updated = [...prev]
      const newQty = updated[idx].cantidad + delta
      if (newQty <= 0) return updated.filter((_, i) => i !== idx)
      updated[idx] = { ...updated[idx], cantidad: newQty }
      return updated
    })
  }

  // ── Confirm sale ──────────────────────────────────────────────────────────

  async function confirmarVenta() {
    if (cart.length === 0) return
    if (metodo === 'efectivo' && (parseFloat(montoRecibido) || 0) < total) return
    setProcessing(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total,
          metodo_pago: metodo,
          estado: 'completada',
          items: cart.map((item) => ({
            product_id: item.product.id,
            variant_id: item.variant?.id ?? null,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.precio_unitario * item.cantidad,
            promo_label: item.promo_label ?? null,
          })),
        }),
      })
      const { data: sale, error } = (await res.json()) as {
        data: { id: string; created_at: string } | null
        error: string | null
      }
      if (error || !sale) throw new Error(error ?? 'Error al registrar')

      setReceipt({
        id: sale.id,
        items: cart,
        total,
        metodo_pago: metodo,
        montoRecibido: metodo === 'efectivo' ? parseFloat(montoRecibido) : undefined,
        vuelto: vuelto ?? undefined,
        created_at: sale.created_at,
        empleadoNombre,
      })
      // Invalidate router cache so Caja page reflects new sale on next navigation
      router.refresh()
      setCart([])
      setMontoRecibido('')
      setSearch('')
      setDisplaySearch('')
      setCartOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al procesar la venta')
    } finally {
      setProcessing(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const productGrid = (list: Product[]) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((p) => (
        <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p)} />
      ))}
    </div>
  )

  const cartProps = {
    cart,
    updateQty,
    clearCart: () => setCart([]),
    metodo,
    setMetodo,
    montoRecibido,
    setMontoRecibido,
    total,
    vuelto,
    processing,
    onConfirm: confirmarVenta,
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Scan feedback toast ───────────────────────────────────────────── */}
      {scanToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-lg text-sm font-semibold ${
              scanToast.ok
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {scanToast.ok
              ? <CheckCircle className="h-4 w-4 shrink-0" />
              : <X className="h-4 w-4 shrink-0" />}
            <span>{scanToast.msg}</span>
          </div>
        </div>
      )}

      {/* ── Left: products panel ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Search bar */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchRef}
              type="text"
              value={displaySearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre, marca o código de barras…"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-9 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {displaySearch ? (
              <button
                onClick={() => { handleSearchChange(''); searchRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ScanBarcode
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 dark:text-gray-600"
                aria-label="Pistola lectora activa"
              />
            )}
          </div>

          {/* Category tabs — only visible when not searching */}
          {!search.trim() && !loadingProducts && (categories.length > 0 || promos.length > 0) && (
            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              hasPromos={promos.length > 0}
              onSelect={(id) => {
                setSelectedCategory(id)
                if (id !== PROMO_TAB) searchRef.current?.focus()
              }}
            />
          )}
        </div>

        {/* Product area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-3">
          {loadingProducts ? (
            <SkeletonGrid />
          ) : selectedCategory === PROMO_TAB ? (
            /* ── Promos view ────────────────────────────────────────── */
            promos.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl">🎉</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sin promos activas</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {promos.map((promo) => (
                  <POSPromoCard
                    key={promo.id}
                    promo={promo}
                    onAdd={addPromoToCart}
                  />
                ))}
              </div>
            )
          ) : search.trim() ? (
            /* ── Search results (flat) ─────────────────────────────── */
            filteredProducts.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl">🔍</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Sin resultados para{' '}
                    <span className="font-medium">&ldquo;{displaySearch}&rdquo;</span>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                  {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
                </p>
                {productGrid(filteredProducts)}
              </div>
            )
          ) : selectedCategory ? (
            /* ── Filtered by category (flat) ───────────────────────── */
            filteredProducts.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Sin productos en esta categoría
                </p>
              </div>
            ) : (
              productGrid(filteredProducts)
            )
          ) : (
            /* ── All products grouped by category ──────────────────── */
            groupedByCategory && groupedByCategory.length > 0 ? (
              <div className="space-y-5">
                {groupedByCategory.map(({ category, products: catProducts }) => (
                  <div key={category.id}>
                    {/* Category header */}
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className="mb-2 flex items-center gap-1.5 group"
                    >
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {category.emoji && <span className="mr-1">{category.emoji}</span>}
                        {category.nombre}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-gray-600">
                        ({catProducts.length})
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                    {productGrid(catProducts)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">Sin productos cargados</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Right: cart sidebar (desktop only) ───────────────────────────── */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CartContent {...cartProps} />
      </div>

      {/* ── Mobile: FAB cart button ──────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-30 lg:hidden">
        <button
          onClick={() => setCartOpen(true)}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
            cartCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <ShoppingCart
            className={`h-6 w-6 ${
              cartCount > 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
        {/* Total preview chip */}
        {total > 0 && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 dark:bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-white dark:text-gray-900 shadow">
            {fmt(total)}
          </div>
        )}
      </div>

      {/* ── Mobile: cart bottom sheet ────────────────────────────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl">
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <CartContent {...cartProps} onClose={() => setCartOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {variantFor && (
        <VariantPicker
          product={variantFor}
          onSelect={(v) => addToCart(variantFor, v)}
          onClose={() => setVariantFor(null)}
        />
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}
