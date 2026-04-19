import { getProfile } from '@/lib/auth'
import { POSDashboard } from '@/components/empleados/POSDashboard'

export default async function VentasPage() {
  const profile = await getProfile()
  if (!profile) return null

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-0 overflow-hidden">
      <POSDashboard empleadoId={profile.id} empleadoNombre={`${profile.nombre ?? ''} ${profile.apellido ?? ''}`.trim()} />
    </div>
  )
}
