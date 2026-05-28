'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, CreditCard, Banknote, Clock, TrendingUp, X, AlertTriangle, RefreshCw } from 'lucide-react'
import type { CashSession, Sale } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Modal de confirmación de cierre ─────────────────────────────────────────

interface CierreModalProps {
  totalGeneral: number
  totalEfectivo: number
  totalMP: number
  totalTransfer: number
  cantidadVentas: number
  montoApertura: number
  notas: string
  onNotasChange: (v: string) => void
  montoContado: string
  onMontoContadoChange: (v: string) => void
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}

function CierreModal({
  totalGeneral, totalEfectivo, totalMP, totalTransfer,
  cantidadVentas, montoApertura, notas, onNotasChange,
  montoContado, onMontoContadoChange, saving, onConfirm, onCancel,
}: CierreModalProps) {
  const contadoNum = parseFloat(montoContado) || 0
  const diferencia = contadoNum > 0 ? contadoNum - totalEfectivo : null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Confirmar cierre de caja</h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resumen */}
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Resumen del turno</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total vendido</p>
              <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-gray-100">{fmt(totalGeneral)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{cantidadVentas} ventas</p>
            </div>
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo</p>
              <p className="mt-0.5 text-sm font-bold text-green-700 dark:text-green-400">{fmt(totalEfectivo)}</p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Mercado Pago</p>
              <p className="mt-0.5 text-sm font-bold text-blue-700 dark:text-blue-400">{fmt(totalMP)}</p>
            </div>
            <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transferencia</p>
              <p className="mt-0.5 text-sm font-bold text-purple-700 dark:text-purple-400">{fmt(totalTransfer)}</p>
            </div>
          </div>

          {/* Conteo de efectivo */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Efectivo contado al cierre
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={montoContado}
                onChange={(e) => onMontoContadoChange(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-7 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
            {diferencia !== null && (
              <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${
                Math.abs(diferencia) < 50
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : diferencia < 0
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
              }`}>
                <span>Diferencia vs ventas efectivo</span>
                <span>{diferencia >= 0 ? '+' : ''}{fmt(diferencia)}</span>
              </div>
            )}
            {montoApertura > 0 && contadoNum > 0 && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Apertura: {fmt(montoApertura)} · En caja neto: {fmt(contadoNum - montoApertura)}
              </p>
            )}
          </div>

          {/* Notas */}
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Notas del cierre (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => onNotasChange(e.target.value)}
              rows={2}
              placeholder="Observaciones, diferencias de caja, etc."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Cerrando...' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export function CajaView({ empleadoId, empleadoNombre }: { empleadoId: string; empleadoNombre: string }) {
  const [session, setSession] = useState<CashSession | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [montoApertura, setMontoApertura] = useState('')
  const [notas, setNotas] = useState('')
  const [montoContado, setMontoContado] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCierreModal, setShowCierreModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sesRes = await fetch(`/api/sales/caja?empleado_id=${empleadoId}&abierta=true`)
      const { data: ses } = (await sesRes.json()) as { data: CashSession | null }
      setSession(ses)

      if (ses) {
        const desde = encodeURIComponent(ses.apertura)
        const salesRes = await fetch(`/api/sales?empleado_id=${empleadoId}&from=${desde}&limit=100`)
        const { data: salesData } = (await salesRes.json()) as { data: Sale[] }
        setSales(salesData ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [empleadoId])

  useEffect(() => { fetchData() }, [fetchData])

  async function abrirCaja() {
    setSaving(true)
    try {
      await fetch('/api/sales/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_apertura: parseFloat(montoApertura) || 0,
        }),
      })
      setMontoApertura('')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  async function cerrarCaja() {
    if (!session) return
    setSaving(true)
    try {
      await fetch(`/api/sales/caja/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        notas,
        monto_cierre: parseFloat(montoContado) || undefined,
      }),
      })
      setShowCierreModal(false)
      setNotas('')
      setMontoContado('')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  // Totals
  const completadas = sales.filter((s) => s.estado === 'completada')
  const totalEfectivo = completadas.filter((s) => s.metodo_pago === 'efectivo').reduce((a, s) => a + s.total, 0)
  const totalMP = completadas.filter((s) => s.metodo_pago === 'mercadopago').reduce((a, s) => a + s.total, 0)
  const totalTransfer = completadas.filter((s) => s.metodo_pago === 'transferencia').reduce((a, s) => a + s.total, 0)
  const totalGeneral = totalEfectivo + totalMP + totalTransfer

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  // ── Sin sesión abierta ─────────────────────────────────────────────────────
  if (!session || session.cierre) {
    return (
      <div className="flex flex-col gap-6">
        {session?.cierre && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Última sesión cerrada</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFecha(session.apertura)} {formatHora(session.apertura)} → {formatHora(session.cierre!)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-green-50 dark:bg-green-950/30 px-3 py-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo</p>
                <p className="font-semibold text-green-700 dark:text-green-400">{fmt(session.total_efectivo ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">MP</p>
                <p className="font-semibold text-blue-700 dark:text-blue-400">{fmt(session.total_mp ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Ventas</p>
                <p className="font-semibold text-indigo-700 dark:text-indigo-400">{session.total_ventas ?? 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Abrir caja */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Abrir caja</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Monto en caja al inicio
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-7 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
            </div>
            <button
              onClick={abrirCaja}
              disabled={saving}
              className="rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Sesión activa ──────────────────────────────────────────────────────────
  return (
    <>
      {showCierreModal && (
        <CierreModal
          totalGeneral={totalGeneral}
          totalEfectivo={totalEfectivo}
          totalMP={totalMP}
          totalTransfer={totalTransfer}
          cantidadVentas={completadas.length}
          montoApertura={session.monto_apertura ?? 0}
          notas={notas}
          onNotasChange={setNotas}
          montoContado={montoContado}
          onMontoContadoChange={setMontoContado}
          saving={saving}
          onConfirm={cerrarCaja}
          onCancel={() => setShowCierreModal(false)}
        />
      )}

      <div className="flex flex-col gap-6">
        {/* Estado de sesión */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Caja abierta</p>
            <span className="text-xs text-emerald-600 dark:text-emerald-500">
              desde {formatHora(session.apertura)} — {empleadoNombre}
            </span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Total vendido</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(totalGeneral)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{completadas.length} ventas</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Efectivo</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(totalEfectivo)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Mercado Pago</span>
            </div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{fmt(totalMP)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Transferencia</span>
            </div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{fmt(totalTransfer)}</p>
          </div>
        </div>

        {/* Últimas ventas */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Últimas ventas del turno</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-500">{completadas.length} total</span>
              <button
                onClick={fetchData}
                title="Actualizar"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>
          {completadas.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">Sin ventas en este turno</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {completadas.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatHora(s.created_at)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{s.metodo_pago}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(s.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cerrar caja */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Cerrar caja</h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Al cerrar se registrará el resumen del turno. Esta acción no se puede deshacer.
          </p>
          <button
            onClick={() => setShowCierreModal(true)}
            disabled={saving}
            className="w-full rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 py-2.5 text-sm font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
          >
            Cerrar caja
          </button>
        </div>
      </div>
    </>
  )
}
