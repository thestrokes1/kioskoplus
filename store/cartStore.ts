'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, ProductVariant } from '@/types/index'

interface CartStore {
  items: CartItem[]
  addItem: (
    product: Product,
    variant: ProductVariant | null,
    cantidad?: number,
    precio_manual?: number,
    promo_label?: string
  ) => void
  /**
   * Elimina un item. Si promoLabel no se pasa, elimina el item REGULAR
   * (sin promo). Si se pasa una string, elimina el item con ese promo_label.
   */
  removeItem: (productId: string, variantId: string | null, promoLabel?: string) => void
  /** Elimina TODOS los items de una promo completa de una vez */
  removePromo: (promoLabel: string) => void
  /**
   * Actualiza cantidad de un item específico. Igual que removeItem:
   * sin promoLabel opera sobre el item regular, con promoLabel sobre el de promo.
   */
  updateCantidad: (productId: string, variantId: string | null, cantidad: number, promoLabel?: string) => void
  clearCart: () => void
  total: () => number
  cantidadTotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(product, variant, cantidad = 1, precio_manual, promo_label) {
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.product.id === product.id &&
              (i.variant?.id ?? null) === (variant?.id ?? null) &&
              (i.promo_label ?? null) === (promo_label ?? null)
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id &&
                (i.variant?.id ?? null) === (variant?.id ?? null) &&
                (i.promo_label ?? null) === (promo_label ?? null)
                  ? { ...i, cantidad: i.cantidad + cantidad }
                  : i
              ),
            }
          }
          return {
            items: [
              ...state.items,
              { product, variant, cantidad, precio_manual, promo_label },
            ],
          }
        })
      },

      removeItem(productId, variantId, promoLabel) {
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(
                i.product.id === productId &&
                (i.variant?.id ?? null) === variantId &&
                (i.promo_label ?? undefined) === promoLabel
              )
          ),
        }))
      },

      removePromo(promoLabel) {
        set((state) => ({
          items: state.items.filter((i) => i.promo_label !== promoLabel),
        }))
      },

      updateCantidad(productId, variantId, cantidad, promoLabel) {
        if (cantidad <= 0) {
          get().removeItem(productId, variantId, promoLabel)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId &&
            (i.variant?.id ?? null) === variantId &&
            (i.promo_label ?? undefined) === promoLabel
              ? { ...i, cantidad }
              : i
          ),
        }))
      },

      clearCart() {
        set({ items: [] })
      },

      total() {
        return get().items.reduce((acc, item) => {
          const precio = item.precio_manual != null
            ? item.precio_manual
            : item.product.precio + (item.variant?.precio_extra ?? 0)
          return acc + precio * item.cantidad
        }, 0)
      },

      cantidadTotal() {
        return get().items.reduce((acc, item) => acc + item.cantidad, 0)
      },
    }),
    {
      name: 'kiosko-cart',
    }
  )
)
