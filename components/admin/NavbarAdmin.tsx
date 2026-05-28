'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  BarChart2,
  Users,
  ShoppingCart,
  LogOut,
  Tag,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const links = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/inventario', label: 'Inventario', icon: ClipboardList },
  { href: '/admin/promos',     label: 'Promos',     icon: Tag },
  { href: '/admin/analiticas', label: 'Analíticas', icon: BarChart2 },
  { href: '/admin/empleados',  label: 'Empleados',  icon: Users },
  { href: '/empleados/ventas', label: 'Ventas',     icon: ShoppingCart },
]

interface NavbarAdminProps {
  nombre?: string | null
  apellido?: string | null
}

export function NavbarAdmin({ nombre, apellido }: NavbarAdminProps) {
  const pathname = usePathname()
  const router = useRouter()

  const initials = [nombre?.[0], apellido?.[0]].filter(Boolean).join('').toUpperCase() || 'A'
  const displayName = [nombre, apellido].filter(Boolean).join(' ') || 'Admin'

  async function handleLogout() {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4">
          <span className="text-xl">🏪</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">Admin</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 dark:border-gray-800 p-3">
          <div className="mb-2 flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
            <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
              {displayName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏪</span>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {initials}
          </div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive(href)
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive(href) ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            <span className="truncate max-w-full px-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
