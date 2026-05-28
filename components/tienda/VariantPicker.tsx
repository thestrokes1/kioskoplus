'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import type { Product, ProductVariant } from '@/types/index'
import { variantLabel } from '@/types/index'

interface VariantPickerProps {
  product: Product
  open: boolean
  onClose: () => void
}

export function VariantPicker({ product, open, onClose }: VariantPickerProps) {
  const [selected, setSelected] = useState<ProductVariant | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const addItem = useCartStore((s) => s.addItem)
  const addToast = useUiStore((s) => s.addToast)

  const variants = product.product_variants?.filter((v) => v.activo) ?? []

  function handleConfirm() {
    if (!selected && variants.length > 0) {
      addToast('Seleccioná una variante', 'error')
      return
    }
    addItem(product, selected, cantidad)
    addToast(`${product.emoji} ${product.nombre}${selected ? ` (${variantLabel(selected)})` : ''} agregado`, 'success')
    onClose()
    setSelected(null)
    setCantidad(1)
  }

  const precioTotal = (selected?.precio_variante ?? product.precio) * cantidad

  return (
    <Modal open={open} onClose={onClose} title={`${product.emoji} ${product.nombre}`} maxWidth="sm">
      <div className="flex flex-col gap-4">
        {variants.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Elegí una variante</p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  disabled={v.stock === 0}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    selected?.id === v.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="block">{variantLabel(v)}</span>
                  <span className="block text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v.precio_variante ?? product.precio)}
                  </span>
                  {v.stock === 0 && <span className="block text-xs text-red-400">Sin stock</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold text-gray-900 dark:text-gray-100">{cantidad}</span>
            <button
              onClick={() => setCantidad((c) => c + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(precioTotal)}
          </span>
          <Button onClick={handleConfirm} disabled={variants.length > 0 && !selected}>
            Agregar al carrito
          </Button>
        </div>
      </div>
    </Modal>
  )
}
