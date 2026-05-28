import Link from 'next/link'
import { Users, ShieldCheck, ShoppingBag } from 'lucide-react'

export default function PortalPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-12">
      {/* Branding */}
      <div className="mb-10 text-center">
        <span className="text-5xl">🏪</span>
        <h1 className="mt-3 text-3xl font-bold text-white">KioskoPlus</h1>
        <p className="mt-1 text-sm text-gray-400">Sistema de gestión</p>
      </div>

      {/* Opciones de acceso */}
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/empleados/login"
          className="flex items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800 px-6 py-5 transition-all hover:border-indigo-500 hover:bg-gray-750 active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Panel Empleado</p>
            <p className="text-xs text-gray-400">Ventas, inventario y caja</p>
          </div>
        </Link>

        <Link
          href="/admin/login"
          className="flex items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800 px-6 py-5 transition-all hover:border-violet-500 hover:bg-gray-750 active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Panel Admin</p>
            <p className="text-xs text-gray-400">Dashboard, analíticas y configuración</p>
          </div>
        </Link>

        <Link
          href="/tienda"
          className="flex items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800 px-6 py-5 transition-all hover:border-emerald-500 hover:bg-gray-750 active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Tienda</p>
            <p className="text-xs text-gray-400">Ver productos y comprar</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
