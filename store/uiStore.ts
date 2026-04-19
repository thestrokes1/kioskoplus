'use client'

import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface UiStore {
  cartOpen: boolean
  checkoutOpen: boolean
  toasts: Toast[]
  openCart: () => void
  closeCart: () => void
  openCheckout: () => void
  closeCheckout: () => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiStore>()((set) => ({
  cartOpen: false,
  checkoutOpen: false,
  toasts: [],

  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openCheckout: () => set({ checkoutOpen: true, cartOpen: false }),
  closeCheckout: () => set({ checkoutOpen: false }),

  addToast(message, type = 'info') {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },

  removeToast(id) {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))
