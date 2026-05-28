'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, LogOut, LogIn, User, Package } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { Profile } from '@/types/index'

interface NavbarTiendaProps {
  user: Pick<Profile, 'nombre' | 'apellido' | 'role'> | null
}

export function NavbarTienda({ user }: NavbarTiendaProps) {
  const [mounted, setMounted] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const cantidadRaw = useCartStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))
  const clearCart = useCartStore((s) => s.clearCart)
  const openCart = useUiStore((s) => s.openCart)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const cantidad = mounted ? cantidadRaw : 0

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/login', { method: 'DELETE' })
    clearCart()
    router.refresh()
    setLoggingOut(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <a href="/tienda" className="flex items-center gap-2">
          <span className="text-2xl">🏪</span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">KioskoPlus</span>
        </a>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {/* Carrito */}
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Carrito</span>
            {cantidad > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white">
                {cantidad > 99 ? '99+' : cantidad}
              </span>
            )}
          </button>

          {/* Usuario */}
          {user ? (
            <div className="flex items-center gap-2">
              <a
                href="/mis-pedidos"
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors sm:flex"
              >
                <Package className="h-4 w-4" />
                Mis pedidos
              </a>
              <span className="hidden items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 sm:flex">
                <User className="h-4 w-4 text-gray-400" />
                {user.nombre ?? 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
