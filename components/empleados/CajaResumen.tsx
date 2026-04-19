'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { CashSession } from '@/types/index'

interface CajaResumenProps {
  empleadoId: string
}

export function CajaResumen({ empleadoId }: CajaResumenProps) {
  const [session, setSession] = useState<CashSession | null>(null)
  const [montoApertura, setMontoApertura] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sales/caja?empleado_id=${empleadoId}&abierta=true`)
    const { data } = (await res.json()) as { data?: CashSession }
    setSession(data ?? null)
  }, [empleadoId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  async function handleApertura() {
    setLoading(true)
    try {
      const res = await fetch('/api/sales/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado_id: empleadoId,
          monto_apertura: parseFloat(montoApertura || '0'),
          notas,
        }),
      })
      const { data } = (await res.json()) as { data?: CashSession }
      if (data) setSession(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCierre() {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/caja/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas }),
      })
      const { data } = (await res.json()) as { data?: CashSession }
      if (data) setSession(data)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 max-w-sm">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Apertura de caja</h3>
        </div>
        <input
          type="number"
          placeholder="Monto de apertura ($)"
          value={montoApertura}
          onChange={(e) => setMontoApertura(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Notas (opcional)"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
        />
        <Button onClick={handleApertura} loading={loading}>
          Abrir caja
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Caja abierta</h3>
        </div>
        {session.cierre && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Cerrada</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Apertura</p>
          <p className="font-semibold">{fmt(session.monto_apertura)}</p>
        </div>
        {session.total_efectivo !== null && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-gray-500">Efectivo</p>
            <p className="font-semibold text-green-700">{fmt(session.total_efectivo)}</p>
          </div>
        )}
        {session.total_mp !== null && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-gray-500">Mercado Pago</p>
            <p className="font-semibold text-blue-700">{fmt(session.total_mp)}</p>
          </div>
        )}
        {session.total_ventas !== null && (
          <div className="rounded-lg bg-purple-50 p-3">
            <p className="text-xs text-gray-500">Ventas</p>
            <p className="font-semibold text-purple-700">{session.total_ventas}</p>
          </div>
        )}
      </div>

      {!session.cierre && (
        <Button variant="danger" onClick={handleCierre} loading={loading}>
          <X className="h-4 w-4" />
          Cerrar caja
        </Button>
      )}
    </div>
  )
}
