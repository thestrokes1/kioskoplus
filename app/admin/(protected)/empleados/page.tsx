'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Users, Clock, MessageSquare, X, UserPlus, Pencil, Trash2, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EmpleadoStats {
  id: string
  nombre: string | null
  apellido: string | null
  role: string
  ventas_hoy: number
  monto_hoy: number
  ultima_venta: string | null
}

interface CashSession {
  id: string
  empleado_id: string
  apertura: string
  cierre: string | null
  monto_apertura: number
  monto_cierre: number | null
  total_efectivo: number | null
  total_mp: number | null
  total_ventas: number | null
  estado: string
  notas: string | null
  profiles?: { nombre: string | null; apellido: string | null } | null
}

interface SaleItem {
  id: string
  product_id: string
  cantidad: number
  subtotal: number
  products?: { nombre: string; emoji: string } | null
  product_variants?: { nombre: string } | null
}

interface SessionSale {
  id: string
  total: number
  metodo_pago: string
  created_at: string
  sale_items?: SaleItem[]
}

interface VentaRow {
  id: string
  total: number
  metodo_pago: string
  created_at: string
  estado: string
  profiles?: { nombre: string | null; apellido: string | null } | null
  sale_items?: SaleItem[]
}

interface EmployeeLog {
  id: string
  empleado_id: string
  tipo: 'entrada' | 'salida' | 'comentario' | 'incidente'
  nota: string
  sale_id: string | null
  product_id: string | null
  created_at: string
  empleado?: { nombre: string | null; apellido: string | null } | null
  autor?: { nombre: string | null; apellido: string | null } | null
  sales?: { id: string; total: number } | null
  products?: { nombre: string; emoji: string } | null
}

interface SimpleProduct {
  id: string
  nombre: string
  emoji: string
}

interface RecentSale {
  id: string
  total: number
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function horas(apertura: string, cierre: string | null) {
  const a = new Date(apertura)
  const c = cierre ? new Date(cierre) : new Date()
  const diff = (c.getTime() - a.getTime()) / 3600000
  return diff.toFixed(1)
}

const TIPO_COLORS: Record<string, string> = {
  entrada: 'success',
  salida: 'default',
  comentario: 'info',
  incidente: 'danger',
}

const TIPO_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  comentario: 'Comentario',
  incidente: 'Incidente',
}

const TIPO_ICONS: Record<string, string> = {
  entrada: '🟢',
  salida: '🔴',
  comentario: '💬',
  incidente: '⚠️',
}

const PAGE_SIZE = 20

// ─── Modal: Agregar Empleado ──────────────────────────────────────────────────

function AddEmployeeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    role: 'empleado' as 'empleado' | 'admin',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        onSuccess()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Agregar empleado</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nombre *</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                placeholder="Juan"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Apellido *</label>
              <input
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                required
                placeholder="García"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Email *</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="juan@ejemplo.com"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Contraseña * (mín. 6 caracteres)</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Rol *</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="empleado">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creando...' : 'Crear empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Historial del empleado ───────────────────────────────────────────

function EmployeeHistorialModal({ empleado, onClose }: { empleado: EmpleadoStats; onClose: () => void }) {
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sessionSales, setSessionSales] = useState<Record<string, SessionSale[]>>({})
  const [loadingSales, setLoadingSales] = useState<Set<string>>(new Set())

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/sales/caja?empleado_id=${empleado.id}&desde=${desde}&hasta=${hasta}&all=true`)
    const json = await res.json()
    setSessions(json.data ?? [])
    setLoading(false)
  }, [empleado.id, desde, hasta])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  async function toggleSession(s: CashSession) {
    if (expandedId === s.id) { setExpandedId(null); return }
    setExpandedId(s.id)
    if (sessionSales[s.id]) return
    setLoadingSales((prev) => new Set([...prev, s.id]))
    const to = s.cierre ?? new Date().toISOString()
    const res = await fetch(`/api/sales?empleado_id=${empleado.id}&from=${encodeURIComponent(s.apertura)}&to=${encodeURIComponent(to)}&limit=200`)
    const json = await res.json()
    setSessionSales((prev) => ({ ...prev, [s.id]: json.data ?? [] }))
    setLoadingSales((prev) => { const n = new Set(prev); n.delete(s.id); return n })
  }

  // KPIs
  const cerradas = sessions.filter((s) => s.cierre)
  const totalHoras = cerradas.reduce((a, s) => a + parseFloat(horas(s.apertura, s.cierre)), 0)
  const totalVentas = sessions.reduce((a, s) => a + (s.total_ventas ?? 0), 0)
  const totalEfectivo = sessions.reduce((a, s) => a + (s.total_efectivo ?? 0), 0)
  const totalMP = sessions.reduce((a, s) => a + (s.total_mp ?? 0), 0)
  const totalGeneral = totalEfectivo + totalMP
  const initials = [empleado.nombre?.[0], empleado.apellido?.[0]].filter(Boolean).join('').toUpperCase() || '?'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-4 w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{empleado.nombre} {empleado.apellido}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{empleado.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Filtro de fechas */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="flex gap-2">
              {[
                { label: 'Hoy', days: 0 },
                { label: '7 días', days: 7 },
                { label: '30 días', days: 30 },
              ].map(({ label, days }) => (
                <button key={label} type="button"
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() - days)
                    setDesde(d.toISOString().split('T')[0])
                    setHasta(new Date().toISOString().split('T')[0])
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs del período */}
          {!loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Turnos', value: String(sessions.length), color: 'text-gray-900 dark:text-gray-100' },
                { label: 'Horas trabajadas', value: `${totalHoras.toFixed(1)}h`, color: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Ventas', value: String(totalVentas), color: 'text-gray-900 dark:text-gray-100' },
                { label: 'Efectivo', value: fmt(totalEfectivo), color: 'text-green-700 dark:text-green-400' },
                { label: 'Total vendido', value: fmt(totalGeneral), color: 'text-gray-900 dark:text-gray-100' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={`mt-0.5 text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Turnos / Sesiones */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-12 text-center">
              <Clock className="mx-auto mb-2 h-7 w-7 text-gray-300" />
              <p className="text-sm text-gray-400">Sin turnos en el período</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Apertura</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Cierre</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Horas</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">$Apertura</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">$Cierre</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Diferencia</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Ventas</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Efectivo</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">MP</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {sessions.map((s) => {
                      const isExp = expandedId === s.id
                      const difCaja = s.monto_cierre != null && s.total_efectivo != null
                        ? s.monto_cierre - (s.monto_apertura + s.total_efectivo)
                        : null
                      const sales = sessionSales[s.id]
                      const isLoadingSales = loadingSales.has(s.id)
                      return (
                        <React.Fragment key={s.id}>
                          <tr
                            onClick={() => toggleSession(s)}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                              {new Date(s.apertura).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                              {s.cierre
                                ? new Date(s.cierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : <span className="font-medium text-emerald-500">En curso</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-700 dark:text-gray-300">{horas(s.apertura, s.cierre)}h</td>
                            <td className="px-4 py-3 text-right text-xs text-gray-600 dark:text-gray-400">{fmt(s.monto_apertura)}</td>
                            <td className="px-4 py-3 text-right text-xs text-gray-600 dark:text-gray-400">
                              {s.monto_cierre != null ? fmt(s.monto_cierre) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold">
                              {difCaja !== null
                                ? <span className={Math.abs(difCaja) < 50 ? 'text-emerald-600' : difCaja < 0 ? 'text-red-600' : 'text-amber-600'}>
                                    {difCaja >= 0 ? '+' : ''}{fmt(difCaja)}
                                  </span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-700 dark:text-gray-300">{s.total_ventas ?? '—'}</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-green-700 dark:text-green-400">{fmt(s.total_efectivo ?? 0)}</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-blue-700 dark:text-blue-400">{fmt(s.total_mp ?? 0)}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={s.estado === 'abierta' ? 'success' : 'default'} size="sm">{s.estado}</Badge>
                            </td>
                          </tr>

                          {/* Notas + ventas expandidas */}
                          {isExp && (
                            <tr>
                              <td colSpan={10} className="bg-indigo-50/40 dark:bg-indigo-950/10 px-4 pb-4 pt-2">
                                {s.notas && (
                                  <div className="mb-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-800 px-3 py-2">
                                    <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-0.5">Notas del cierre</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{s.notas}</p>
                                  </div>
                                )}
                                {isLoadingSales ? (
                                  <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                                ) : sales && sales.length > 0 ? (
                                  <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                                    <table className="w-full text-xs">
                                      <thead className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium text-gray-500">Hora</th>
                                          <th className="px-3 py-2 text-left font-medium text-gray-500">Productos</th>
                                          <th className="px-3 py-2 text-center font-medium text-gray-500">Método</th>
                                          <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {sales.map((sale) => (
                                          <tr key={sale.id} className="bg-white dark:bg-gray-900">
                                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                              {new Date(sale.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-xs">
                                              {(sale.sale_items ?? []).map((i) =>
                                                `${i.products?.emoji ?? '📦'} ${i.products?.nombre ?? '?'}${i.product_variants?.nombre ? ` (${i.product_variants.nombre})` : ''} x${i.cantidad}`
                                              ).join(' · ')}
                                            </td>
                                            <td className="px-3 py-2 text-center capitalize text-gray-500 dark:text-gray-400">{sale.metodo_pago}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(sale.total)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-center text-xs text-gray-400 py-4">Sin ventas en este turno</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Equipo ──────────────────────────────────────────────────────────────

function TabEquipo() {
  const [empleados, setEmpleados] = useState<EmpleadoStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [historialEmpleado, setHistorialEmpleado] = useState<EmpleadoStats | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/staff')
      .then((r) => r.json())
      .then((json) => setEmpleados(json.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Agregar empleado
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {empleados.map((e) => {
          const activo = !!e.ultima_venta && (Date.now() - new Date(e.ultima_venta).getTime()) < 3600000 * 4
          const initials = [e.nombre?.[0], e.apellido?.[0]].filter(Boolean).join('').toUpperCase() || '?'
          return (
            <div key={e.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {initials}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${activo ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {e.nombre} {e.apellido}
                  </p>
                  <Badge variant={e.role === 'admin' ? 'info' : 'default'} size="sm">{e.role}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ventas hoy</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{e.ventas_hoy}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monto hoy</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(e.monto_hoy)}</p>
                </div>
              </div>
              {e.ultima_venta && (
                <p className="mt-2 text-xs text-gray-400">
                  Última venta: {new Date(e.ultima_venta).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <button
                onClick={() => setHistorialEmpleado(e)}
                className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors dark:border-indigo-800/50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
              >
                Ver historial completo
              </button>
            </div>
          )
        })}
        {empleados.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
            <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Sin empleados registrados</p>
          </div>
        )}
      </div>

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); load() }}
        />
      )}

      {historialEmpleado && (
        <EmployeeHistorialModal
          empleado={historialEmpleado}
          onClose={() => setHistorialEmpleado(null)}
        />
      )}
    </>
  )
}

// ─── Tab: Historial de Ventas ─────────────────────────────────────────────────

const METODO_CONFIG: Record<string, { label: string; color: string }> = {
  efectivo:      { label: 'Efectivo',      color: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30' },
  mercadopago:   { label: 'Mercado Pago',  color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' },
  transferencia: { label: 'Transferencia', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' },
}

function TabVentas() {
  const [staff, setStaff] = useState<EmpleadoStats[]>([])
  const [sales, setSales] = useState<VentaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0])
  const [filterEmpleadoId, setFilterEmpleadoId] = useState('')
  const [filterMetodo, setFilterMetodo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Load staff once
  useEffect(() => {
    fetch('/api/admin/staff')
      .then((r) => r.json())
      .then((json) => setStaff(json.data ?? []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: '300',
      from: `${desde}T00:00:00-03:00`,
      to:   `${hasta}T23:59:59-03:00`,
    })
    if (filterEmpleadoId) params.set('empleado_id', filterEmpleadoId)
    if (filterMetodo)     params.set('metodo_pago', filterMetodo)
    const res = await fetch(`/api/sales?${params}`)
    const json = await res.json()
    setSales(json.data ?? [])
    setLoading(false)
  }, [desde, hasta, filterEmpleadoId, filterMetodo])

  useEffect(() => { load() }, [load])

  // KPIs (computed from all loaded sales)
  const kpiEfectivo      = sales.filter((s) => s.metodo_pago === 'efectivo').reduce((a, s) => a + s.total, 0)
  const kpiMP            = sales.filter((s) => s.metodo_pago === 'mercadopago').reduce((a, s) => a + s.total, 0)
  const kpiTransferencia = sales.filter((s) => s.metodo_pago === 'transferencia').reduce((a, s) => a + s.total, 0)
  const kpiTotal         = sales.reduce((a, s) => a + s.total, 0)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filtros ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">

        {/* Empleado */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Empleado</label>
          <select
            value={filterEmpleadoId}
            onChange={(e) => setFilterEmpleadoId(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">Todos</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>
            ))}
          </select>
        </div>

        {/* Método de pago */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Método de pago</label>
          <div className="flex gap-1.5">
            {[
              { value: '', label: 'Todos' },
              { value: 'efectivo', label: '💵 Efectivo' },
              { value: 'mercadopago', label: '📱 MP' },
              { value: 'transferencia', label: '🏦 Transfer.' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilterMetodo(value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  filterMetodo === value
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]" />
        </div>

        {/* Shortcuts */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 opacity-0">.</label>
          <div className="flex gap-1.5">
            {[
              { label: 'Hoy', days: 0 },
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
            ].map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() - days)
                  setDesde(d.toISOString().split('T')[0])
                  setHasta(new Date().toISOString().split('T')[0])
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tickets',      value: String(sales.length),  color: 'text-gray-900 dark:text-gray-100',          sub: '' },
            { label: 'Efectivo',     value: fmt(kpiEfectivo),      color: 'text-green-700 dark:text-green-400',        sub: `${sales.filter(s=>s.metodo_pago==='efectivo').length} tickets` },
            { label: 'Mercado Pago', value: fmt(kpiMP),            color: 'text-blue-700 dark:text-blue-400',          sub: `${sales.filter(s=>s.metodo_pago==='mercadopago').length} tickets` },
            { label: 'Total',        value: fmt(kpiTotal),         color: 'text-indigo-700 dark:text-indigo-400',      sub: `+ ${fmt(kpiTransferencia)} transfer.` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`mt-0.5 text-lg font-bold ${color}`}>{value}</p>
              {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla de ventas ──────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <ShoppingCart className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin ventas en el período seleccionado</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fecha y hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Productos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Método</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {sales.map((sale) => {
                  const isExp = expandedId === sale.id
                  const metodo = METODO_CONFIG[sale.metodo_pago]
                  const resumen = (sale.sale_items ?? [])
                    .map((i) => `${i.products?.emoji ?? '📦'} ${i.products?.nombre ?? '?'}${i.product_variants?.nombre ? ` (${i.product_variants.nombre})` : ''} x${i.cantidad}`)
                    .join(' · ')

                  return (
                    <React.Fragment key={sale.id}>
                      <tr
                        onClick={() => setExpandedId(isExp ? null : sale.id)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        {/* Chevron */}
                        <td className="px-3 py-3 text-gray-400">
                          {isExp
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />}
                        </td>
                        {/* Fecha */}
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(sale.created_at).toLocaleString('es-AR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        {/* Empleado */}
                        <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {sale.profiles?.nombre} {sale.profiles?.apellido}
                        </td>
                        {/* Productos resumidos */}
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {resumen || '—'}
                        </td>
                        {/* Método */}
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${metodo?.color ?? 'text-gray-600 bg-gray-100'}`}>
                            {metodo?.label ?? sale.metodo_pago}
                          </span>
                        </td>
                        {/* Total */}
                        <td className="px-4 py-3 text-right text-xs font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {fmt(sale.total)}
                        </td>
                      </tr>

                      {/* Detalle expandido */}
                      {isExp && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/60 dark:bg-gray-800/30 px-6 pb-4 pt-2">
                            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                              <table className="w-full text-xs">
                                <thead className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Cant.</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500">P. Unit.</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-500">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                  {(sale.sale_items ?? []).map((item) => (
                                    <tr key={item.id} className="bg-white dark:bg-gray-900">
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                        {item.products?.emoji ?? '📦'} {item.products?.nombre ?? '?'}
                                        {item.product_variants?.nombre && (
                                          <span className="ml-1 text-gray-400">({item.product_variants.nombre})</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{item.cantidad}</td>
                                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmt(item.subtotal / item.cantidad)}</td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                  <tr>
                                    <td colSpan={3} className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-gray-900 dark:text-gray-100">{fmt(sale.total)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {sales.length >= 300 && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 text-center text-xs text-amber-600 dark:text-amber-400">
              Mostrando los 300 más recientes. Acotá el rango de fechas para ver más.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Comentarios ─────────────────────────────────────────────────────────

function TabComentarios() {
  // Filter state
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEmpleadoId, setFilterEmpleadoId] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  // List state
  const [logs, setLogs] = useState<EmployeeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Edit/Delete state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTipo, setEditTipo] = useState<EmployeeLog['tipo']>('comentario')
  const [editNota, setEditNota] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Reference data
  const [staff, setStaff] = useState<EmpleadoStats[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([])

  // Form state
  const [saving, setSaving] = useState(false)
  const [tipo, setTipo] = useState<'comentario' | 'incidente' | 'entrada' | 'salida'>('comentario')
  const [nota, setNota] = useState('')
  const [formEmpleadoId, setFormEmpleadoId] = useState('')
  const [linkedSaleId, setLinkedSaleId] = useState('')
  const [linkedProductId, setLinkedProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productInputRef = useRef<HTMLInputElement>(null)

  // Load reference data once
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/staff').then((r) => r.json()),
      fetch('/api/sales?limit=5').then((r) => r.json()),
      fetch('/api/products?activo=true').then((r) => r.json()),
    ]).then(([staffJson, salesJson, productsJson]) => {
      setStaff(staffJson.data ?? [])
      setRecentSales(
        (salesJson.data ?? []).map((s: { id: string; total: number; created_at: string }) => ({
          id: s.id,
          total: s.total,
          created_at: s.created_at,
        }))
      )
      setAllProducts(
        (productsJson.data ?? []).map((p: { id: string; nombre: string; emoji: string }) => ({
          id: p.id,
          nombre: p.nombre,
          emoji: p.emoji,
        }))
      )
    })
  }, [])

  // Fetch logs
  const fetchLogs = useCallback(
    async (p: number, reset: boolean) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
      if (filterTipo) params.set('tipo', filterTipo)
      if (filterEmpleadoId) params.set('empleado_id', filterEmpleadoId)
      if (filterDesde) params.set('desde', `${filterDesde}T00:00:00-03:00`)
      if (filterHasta) params.set('hasta', `${filterHasta}T23:59:59-03:00`)

      const res = await fetch(`/api/employee-logs?${params}`)
      const json = await res.json()
      const newLogs: EmployeeLog[] = json.data ?? []
      const count: number = json.count ?? 0

      setLogs((prev) => (reset ? newLogs : [...prev, ...newLogs]))
      setHasMore(p * PAGE_SIZE < count)
      setPage(p)
      setLoading(false)
      setLoadingMore(false)
    },
    [filterTipo, filterEmpleadoId, filterDesde, filterHasta]
  )

  useEffect(() => {
    fetchLogs(1, true)
  }, [fetchLogs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nota.trim()) return
    setSaving(true)
    await fetch('/api/employee-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        nota,
        empleado_id: formEmpleadoId || undefined,
        sale_id: linkedSaleId || null,
        product_id: linkedProductId || null,
      }),
    })
    setNota('')
    setFormEmpleadoId('')
    setLinkedSaleId('')
    setLinkedProductId('')
    setProductQuery('')
    setSaving(false)
    fetchLogs(1, true)
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectProduct(p: SimpleProduct) {
    setLinkedProductId(p.id)
    setProductQuery(`${p.emoji} ${p.nombre}`)
    setShowProductDropdown(false)
  }

  function clearProduct() {
    setLinkedProductId('')
    setProductQuery('')
    setShowProductDropdown(false)
  }

  function startEdit(log: EmployeeLog) {
    setEditingId(log.id)
    setEditTipo(log.tipo)
    setEditNota(log.nota)
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNota('')
  }

  async function saveEdit(id: string) {
    setSavingEdit(true)
    const res = await fetch(`/api/employee-logs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: editTipo, nota: editNota }),
    })
    const json = await res.json()
    setSavingEdit(false)
    if (!json.error) {
      setEditingId(null)
      fetchLogs(1, true)
    }
  }

  async function confirmDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/employee-logs/${id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (!json.error) fetchLogs(1, true)
  }

  const filteredProducts = productQuery && !linkedProductId
    ? allProducts.filter((p) =>
        p.nombre.toLowerCase().includes(productQuery.toLowerCase())
      ).slice(0, 6)
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* ── Formulario ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Agregar registro</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Tipo */}
          <div className="flex flex-wrap gap-2">
            {(['comentario', 'incidente', 'entrada', 'salida'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tipo === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {TIPO_ICONS[t]} {TIPO_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Empleado afectado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Empleado afectado</label>
            <select
              value={formEmpleadoId}
              onChange={(e) => setFormEmpleadoId(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">— Yo mismo —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.apellido} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Escribir observación..."
            rows={3}
            required
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />

          {/* Vincular a venta (últimas 5) */}
          {recentSales.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Vincular a venta (opcional)</label>
              <select
                value={linkedSaleId}
                onChange={(e) => setLinkedSaleId(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">— Sin vincular —</option>
                {recentSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id.slice(0, 8).toUpperCase()} — {fmt(s.total)} —{' '}
                    {new Date(s.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vincular a producto (búsqueda con debounce client-side) */}
          <div className="relative flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Vincular a producto (opcional)</label>
            <div className="flex items-center gap-2">
              <input
                ref={productInputRef}
                type="text"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value)
                  if (linkedProductId) setLinkedProductId('')
                  setShowProductDropdown(true)
                }}
                onFocus={() => { if (!linkedProductId) setShowProductDropdown(true) }}
                placeholder="Buscar producto..."
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
              {(productQuery || linkedProductId) && (
                <button
                  type="button"
                  onClick={clearProduct}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProduct(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <span>{p.emoji}</span>
                    <span>{p.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {/* Filtro por tipo */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterTipo('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !filterTipo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            Todos
          </button>
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterTipo(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterTipo === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {TIPO_ICONS[k]} {v}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Filtro por empleado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Empleado</label>
            <select
              value={filterEmpleadoId}
              onChange={(e) => setFilterEmpleadoId(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Todos</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} {s.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro desde */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
            <input
              type="date"
              value={filterDesde}
              onChange={(e) => setFilterDesde(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Filtro hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
            <input
              type="date"
              value={filterHasta}
              onChange={(e) => setFilterHasta(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {(filterDesde || filterHasta || filterEmpleadoId) && (
            <div className="flex flex-col justify-end">
              <button
                onClick={() => { setFilterDesde(''); setFilterHasta(''); setFilterEmpleadoId('') }}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => {
            const isExpanded = expanded.has(log.id)
            const showSobre = log.empleado && (log.autor?.nombre !== log.empleado.nombre || log.autor?.apellido !== log.empleado.apellido)

            return (
              <div
                key={log.id}
                className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(log.id)}
                  className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-lg leading-none mt-0.5">{TIPO_ICONS[log.tipo]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={TIPO_COLORS[log.tipo] as 'success' | 'default' | 'info' | 'danger' | 'warning'} size="sm">
                        {TIPO_LABELS[log.tipo]}
                      </Badge>
                      {showSobre && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Sobre: <span className="font-medium text-gray-700 dark:text-gray-300">{log.empleado?.nombre} {log.empleado?.apellido}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{log.nota}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {log.autor?.nombre ?? log.empleado?.nombre} {log.autor?.apellido ?? log.empleado?.apellido}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    {editingId === log.id ? (
                      /* ── Inline edit form ── */
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          {(['comentario', 'incidente', 'entrada', 'salida'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setEditTipo(t)}
                              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                editTipo === t
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {TIPO_ICONS[t]} {TIPO_LABELS[t]}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={editNota}
                          onChange={(e) => setEditNota(e.target.value)}
                          rows={3}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(log.id)}
                            disabled={savingEdit || !editNota.trim()}
                            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {savingEdit ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-xl border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : confirmDeleteId === log.id ? (
                      /* ── Delete confirmation ── */
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">¿Estás seguro que querés eliminar este registro?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmDelete(log.id)}
                            disabled={deletingId === log.id}
                            className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === log.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-xl border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Read mode ── */
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{log.nota}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Tipo: <span className="font-medium">{TIPO_LABELS[log.tipo]}</span></span>
                          {log.autor && <span>Autor: <span className="font-medium">{log.autor.nombre} {log.autor.apellido}</span></span>}
                          {log.empleado && <span>Empleado: <span className="font-medium">{log.empleado.nombre} {log.empleado.apellido}</span></span>}
                          {log.sales && <span>Venta: <span className="font-medium">#{log.sales.id.slice(0, 8).toUpperCase()} — {fmt(log.sales.total)}</span></span>}
                          {log.products && <span>Producto: <span className="font-medium">{log.products.emoji} {log.products.nombre}</span></span>}
                          <span>Fecha: <span className="font-medium">{new Date(log.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => { startEdit(log); }}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Pencil className="h-3 w-3" /> Editar
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteId(log.id); setEditingId(null); }}
                            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3 w-3" /> Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {logs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
              <MessageSquare className="mx-auto mb-2 h-7 w-7 text-gray-300" />
              <p className="text-sm text-gray-400">No hay registros con los filtros seleccionados</p>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchLogs(page + 1, false)}
                disabled={loadingMore}
                className="rounded-xl border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'equipo', label: 'Equipo', icon: Users },
  { key: 'ventas', label: 'Historial de Ventas', icon: ShoppingCart },
  { key: 'comentarios', label: 'Comentarios', icon: MessageSquare },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function EmpleadosAdminPage() {
  const [tab, setTab] = useState<TabKey>('equipo')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Empleados</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'equipo' && <TabEquipo />}
      {tab === 'ventas' && <TabVentas />}
      {tab === 'comentarios' && <TabComentarios />}
    </div>
  )
}
