'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { MP_PUBLIC_KEY } from '@/lib/mercadopago'

export function CheckoutModal() {
  const [loading, setLoading] = useState(false)
  const [mpPrefId, setMpPrefId] = useState<string | null>(null)
  const { items, total, clearCart } = useCartStore()
  const { checkoutOpen, closeCheckout, addToast } = useUiStore()

  async function handleMercadoPago() {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.product.id,
            title: item.variant
              ? `${item.product.nombre} (${item.variant.nombre})`
              : item.product.nombre,
            quantity: item.cantidad,
            unit_price: item.product.precio + (item.variant?.precio_extra ?? 0),
          })),
        }),
      })
      const { data, error } = (await res.json()) as { data?: { preference_id: string }; error?: string }
      if (error || !data) throw new Error(error ?? 'Error al crear preferencia')
      setMpPrefId(data.preference_id)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al procesar pago', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalFormateado = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(total())

  return (
    <Modal open={checkoutOpen} onClose={closeCheckout} title="Finalizar compra" maxWidth="sm">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {items.reduce((a, i) => a + i.cantidad, 0)} producto{items.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xl font-bold text-gray-900">{totalFormateado}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700">Elegí cómo pagar</p>

          {mpPrefId ? (
            <div className="text-center">
              <p className="mb-3 text-sm text-gray-600">
                Hacé clic en el botón para continuar con Mercado Pago
              </p>
              <a
                href={`https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mpPrefId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-600 transition-colors"
                onClick={() => {
                  clearCart()
                  closeCheckout()
                }}
              >
                Pagar con Mercado Pago
              </a>
            </div>
          ) : (
            <Button
              onClick={handleMercadoPago}
              loading={loading}
              className="w-full bg-sky-500 hover:bg-sky-600"
              size="lg"
            >
              💳 Mercado Pago
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          También podés pagar en efectivo al retirar tu pedido
        </p>
      </div>
    </Modal>
  )
}

// Necesario para que TypeScript reconozca el prop del SDK
declare global {
  interface Window {
    MercadoPago: unknown
  }
}

export { MP_PUBLIC_KEY }
