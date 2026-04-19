'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { VariantPicker } from './VariantPicker'
import type { Product } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export function ProductCard({ product }: { product: Product }) {
  const [variantOpen, setVariantOpen] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const addToast = useUiStore((s) => s.addToast)

  const hasVariants = (product.product_variants?.length ?? 0) > 0
  const outOfStock = product.stock === 0 && !hasVariants

  function handleAdd() {
    if (hasVariants) {
      setVariantOpen(true)
    } else {
      addItem(product, null)
      addToast(`${product.emoji} ${product.nombre} agregado al carrito`, 'success')
    }
  }

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-xl border bg-white dark:bg-gray-900 transition-all ${
          outOfStock
            ? 'border-gray-100 dark:border-gray-800 opacity-60'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer'
        }`}
        onClick={outOfStock ? undefined : handleAdd}
      >
        {/* Imagen / Emoji */}
        {product.imagen_url ? (
          // eslint-disable-next-line @next/next-eslint/no-img-element
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className="h-24 sm:h-28 w-full rounded-t-xl object-cover"
          />
        ) : (
          <div className="flex h-24 sm:h-28 w-full items-center justify-center rounded-t-xl bg-gray-50 dark:bg-gray-800 text-4xl">
            {product.emoji}
          </div>
        )}

        {/* Sin stock badge */}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-md bg-gray-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            Sin stock
          </span>
        )}

        {/* Variantes badge */}
        {hasVariants && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-md bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
            {product.product_variants?.length} var.
          </span>
        )}

        {/* Info */}
        <div className="flex flex-1 flex-col gap-0.5 p-3">
          {product.categories?.nombre && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {product.categories.nombre}
            </p>
          )}
          <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
            {product.nombre}
          </h3>
          {product.marca && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{product.marca}</p>
          )}
        </div>

        {/* Footer: precio + botón */}
        <div className="flex items-center justify-between px-3 pb-3 pt-0">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {fmt(product.precio)}
          </span>
          {!outOfStock && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {hasVariants && (
        <VariantPicker
          product={product}
          open={variantOpen}
          onClose={() => setVariantOpen(false)}
        />
      )}
    </>
  )
}
