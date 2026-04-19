'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, CreditCard, Phone, Save } from 'lucide-react'

interface ProfileData {
  id: string
  nombre: string | null
  apellido: string | null
  dni: string | null
  telefono: string | null
  role: string
  email: string
}

export default function PerfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then((json) => {
        if (!json) return
        if (json.error) { setError(json.error); return }
        const p: ProfileData = json.data
        setProfile(p)
        setNombre(p.nombre ?? '')
        setApellido(p.apellido ?? '')
        setTelefono(p.telefono ?? '')
      })
      .catch(() => setError('Error al cargar perfil'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, telefono: telefono || null }),
      })
      const json = (await res.json()) as { data: ProfileData | null; error: string | null }
      if (json.error) throw new Error(json.error)
      if (json.data) setProfile({ ...profile!, ...json.data })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto p-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200 mb-6" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Mi perfil</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Non-editable info */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
            <Mail className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Email (no editable)</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{profile?.email}</p>
            </div>
          </div>
          {profile?.dni && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">DNI</p>
                <p className="text-sm text-gray-700">{profile.dni}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">
                <User className="mr-1 inline h-3 w-3" />
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">
              <Phone className="mr-1 inline h-3 w-3" />
              Teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 9 11 1234-5678"
              className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Perfil actualizado correctamente
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="mt-4 flex gap-3">
        <a href="/mis-pedidos" className="text-sm text-indigo-600 hover:underline">
          Ver mis pedidos →
        </a>
      </div>
    </div>
  )
}
