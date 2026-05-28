import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { NavbarAdmin } from '@/components/admin/NavbarAdmin'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/admin/login')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavbarAdmin nombre={profile.nombre} apellido={profile.apellido} />
      <main className="flex-1 overflow-auto p-4 pt-16 pb-20 md:p-6 md:pt-6 md:pb-6">{children}</main>
    </div>
  )
}
