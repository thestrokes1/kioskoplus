'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'

interface ExportButtonProps {
  tipo: 'ventas' | 'inventario'
  desde?: string
  hasta?: string
  label?: string
}

export function ExportButton({ tipo, desde, hasta, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tipo })
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)

      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) return

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? `${tipo}.csv`
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label ?? 'Exportar CSV'}
    </button>
  )
}
