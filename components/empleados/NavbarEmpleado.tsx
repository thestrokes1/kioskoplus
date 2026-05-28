'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShoppingCart, Package, DollarSign, LogOut, LayoutDashboard, MessageSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { Role } from '@/types/index'

interface NavbarEmpleadoProps {
  role: Role
  nombre?: string | null
  apellido?: string | null
}

export function NavbarEmpleado({ role, nombre, apellido }: NavbarEmpleadoProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [ventasTurno, setVentasTurno] = useState<number | null>(null)

  const links = [
    { href: '/empleados/ventas',    label: 'Ventas',       icon: ShoppingCart },
    { href: '/empleados/inventario', label: 'Inventario',  icon: Package },
    { href: '/empleados/caja',      label: 'Caja',         icon: DollarSign },
    { href: '/empleados/comentarios', label: 'Notas',      icon: MessageSquare },
    ...(role === 'admin'
      ? [{ href: '/admin/dashboard', label: 'Admin', icon: LayoutDashboard }]
      : []),
  ]

  const initials = [nombre?.[0], apellido?.[0]].filter(Boolean).join('').toUpperCase() || 'E'
  const displayName = nombre ?? 'Empleado'

  useEffect(() => {
    fetch('/api/sales/caja?abierta=true')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const session = json?.data
        if (session?.apertura) {
          fetch(`/api/sales?from=${encodeURIComponent(session.apertura)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((s) => { if (s?.data) setVentasTurno(s.data.length) })
            .catch(() => null)
        }
      })
      .catch(() => null)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/empleados/login')
  }

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* ── Desktop top nav ───────────────────────────────────────────────── */}
      <header className="hidden sm:block border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <Link href="/tienda" className="mr-3 text-xl font-bold text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity">🏪 Kiosko</Link>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {href === '/empleados/ventas' && ventasTurno !== null && ventasTurno > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                    {ventasTurno > 99 ? '99+' : ventasTurno}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-1.5 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {initials}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏪</span>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{displayName}</span>
          {ventasTurno !== null && ventasTurno > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
              {ventasTurno > 99 ? '99+' : ventasTurno}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive(href)
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive(href) ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            <span>{label}</span>
            {href === '/empleados/ventas' && ventasTurno !== null && ventasTurno > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
                {ventasTurno > 99 ? '9+' : ventasTurno}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  )
}
