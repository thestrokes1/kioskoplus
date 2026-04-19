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
    { href: '/empleados/ventas', label: 'Ventas', icon: ShoppingCart },
    { href: '/empleados/inventario', label: 'Inventario', icon: Package },
    { href: '/empleados/caja', label: 'Caja', icon: DollarSign },
    { href: '/empleados/comentarios', label: 'Comentarios', icon: MessageSquare },
    ...(role === 'admin'
      ? [{ href: '/admin/dashboard', label: 'Admin', icon: LayoutDashboard }]
      : []),
  ]

  const initials = [nombre?.[0], apellido?.[0]].filter(Boolean).join('').toUpperCase() || 'E'
  const displayName = nombre ?? 'Empleado'

  useEffect(() => {
    // Fetch open cash session to get turno sales count
    fetch('/api/sales/caja?abierta=true')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const session = json?.data
        if (session?.apertura) {
          // Fetch sales count since session opened
          fetch(`/api/sales?from=${encodeURIComponent(session.apertura)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((s) => {
              if (s?.data) setVentasTurno(s.data.length)
            })
            .catch(() => null)
        }
      })
      .catch(() => null)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/empleados/login')
  }

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <Link href="/" className="mr-3 text-xl font-bold text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity">🏪 Kiosko</Link>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {/* Badge de ventas del turno en Ventas link */}
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
          {/* User info */}
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
  )
}
