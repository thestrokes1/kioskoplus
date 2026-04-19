'use client'

import { useState } from 'react'
import { Search, User } from 'lucide-react'
import type { Profile } from '@/types/index'

interface ClientVerifyProps {
  onSelect: (profile: Profile | null) => void
}

export function ClientVerify({ onSelect }: ClientVerifyProps) {
  const [dni, setDni] = useState('')
  const [result, setResult] = useState<Profile | null | 'not_found'>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!dni.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/registro?dni=${encodeURIComponent(dni)}`)
      const { data } = (await res.json()) as { data?: Profile }
      if (data) {
        setResult(data)
        onSelect(data)
      } else {
        setResult('not_found')
        onSelect(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <User className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="DNI del cliente (opcional)"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {result === 'not_found' && (
        <p className="text-sm text-yellow-600">Cliente no encontrado. Venta sin registro.</p>
      )}
      {result && result !== 'not_found' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
          <User className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            {result.nombre} {result.apellido}
          </span>
        </div>
      )}
    </div>
  )
}
