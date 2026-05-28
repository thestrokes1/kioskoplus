import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { NavbarEmpleado } from '@/components/empleados/NavbarEmpleado'
import type { Role } from '@/types/index'

export default async function EmpleadosProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  const role = profile?.role as Role | undefined
  if (role !== 'empleado' && role !== 'admin') redirect('/empleados/login')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavbarEmpleado role={role} nombre={profile?.nombre} apellido={profile?.apellido} />
      <main className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:pt-6 sm:pb-6">{children}</main>
    </div>
  )
}
