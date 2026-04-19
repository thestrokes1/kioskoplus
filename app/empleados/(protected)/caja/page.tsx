import { getProfile } from '@/lib/auth'
import { CajaView } from '@/components/empleados/CajaView'

export default async function CajaPage() {
  const profile = await getProfile()
  if (!profile) return null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Caja</h1>
      <CajaView empleadoId={profile.id} empleadoNombre={`${profile.nombre ?? ''} ${profile.apellido ?? ''}`.trim()} />
    </div>
  )
}
