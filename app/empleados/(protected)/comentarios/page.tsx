'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Pencil, Trash2, X, Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EmployeeLog {
  id: string
  tipo: 'entrada' | 'salida' | 'comentario' | 'incidente'
  nota: string
  created_at: string
  updated_at: string | null
  registrado_por: string | null
  autor?: { nombre: string | null; apellido: string | null } | null
  sales?: { id: string; total: number } | null
  products?: { nombre: string; emoji: string } | null
}

interface RecentSale {
  id: string
  total: number
  created_at: string
}

interface SimpleProduct {
  id: string
  nombre: string
  emoji: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PAGE_SIZE = 20

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComentariosEmpleadoPage() {
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [tipo, setTipo] = useState<'comentario' | 'incidente' | 'entrada' | 'salida'>('comentario')
  const [nota, setNota] = useState('')
  const [linkedSaleId, setLinkedSaleId] = useState('')
  const [linkedProductId, setLinkedProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const productInputRef = useRef<HTMLInputElement>(null)

  // Reference data
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([])

  // List state
  const [logs, setLogs] = useState<EmployeeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTipo, setEditTipo] = useState<EmployeeLog['tipo']>('comentario')
  const [editNota, setEditNota] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load profile + reference data
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((json) => { if (json.data?.id) setUserId(json.data.id) })
      .catch(() => null)

    Promise.all([
      fetch('/api/sales?limit=10').then((r) => r.json()),
      fetch('/api/products?activo=true').then((r) => r.json()),
    ]).then(([salesJson, productsJson]) => {
      setRecentSales(
        (salesJson.data ?? []).map((s: { id: string; total: number; created_at: string }) => ({
          id: s.id, total: s.total, created_at: s.created_at,
        }))
      )
      setAllProducts(
        (productsJson.data ?? []).map((p: { id: string; nombre: string; emoji: string }) => ({
          id: p.id, nombre: p.nombre, emoji: p.emoji,
        }))
      )
    })
  }, [])

  // Fetch logs
  const fetchLogs = useCallback(
    async (p: number, reset: boolean) => {
      if (!userId) return
      if (reset) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams({
        empleado_id: userId,
        page: String(p),
        pageSize: String(PAGE_SIZE),
      })
      if (filterTipo) params.set('tipo', filterTipo)
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
    [userId, filterTipo, filterDesde, filterHasta]
  )

  useEffect(() => {
    if (userId) fetchLogs(1, true)
  }, [fetchLogs, userId])

  // ── Submit new log ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nota.trim()) return
    setSaveError('')
    setSaving(true)
    const res = await fetch('/api/employee-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        nota: nota.trim(),
        sale_id: linkedSaleId || null,
        product_id: linkedProductId || null,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.error) { setSaveError(json.error); return }
    setNota('')
    setLinkedSaleId('')
    setLinkedProductId('')
    setProductQuery('')
    setTipo('comentario')
    fetchLogs(1, true)
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function startEdit(log: EmployeeLog) {
    setEditingId(log.id)
    setEditTipo(log.tipo)
    setEditNota(log.nota)
    setEditError('')
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNota('')
    setEditError('')
  }

  async function saveEdit(id: string) {
    if (!editNota.trim()) return
    setSavingEdit(true)
    setEditError('')
    const res = await fetch(`/api/employee-logs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: editTipo, nota: editNota.trim() }),
    })
    const json = await res.json()
    setSavingEdit(false)
    if (json.error) { setEditError(json.error); return }
    setEditingId(null)
    // Update locally without full refetch
    setLogs((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, tipo: editTipo, nota: editNota.trim(), updated_at: json.data?.updated_at ?? new Date().toISOString() }
          : l
      )
    )
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function confirmDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/employee-logs/${id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (!json.error) setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  // ── Product search ───────────────────────────────────────────────────────
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

  const filteredProducts =
    productQuery && !linkedProductId
      ? allProducts.filter((p) => p.nombre.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 6)
      : []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Comentarios y registros</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Dejá un comentario, incidente o novedad. El administrador puede verlo en su panel.
        </p>
      </div>

      {/* ── Formulario nuevo registro ──────────────────────────────────── */}
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

          {/* Nota */}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={
              tipo === 'incidente' ? 'Describir el incidente...' :
              tipo === 'entrada'   ? 'Novedades al iniciar turno...' :
              tipo === 'salida'    ? 'Novedades al cerrar turno...' :
                                     'Escribir observación...'
            }
            rows={3}
            required
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          />

          {/* Vincular a venta */}
          {recentSales.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Vincular a venta <span className="font-normal text-gray-400">(opcional)</span>
              </label>
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

          {/* Vincular a producto */}
          <div className="relative flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Vincular a producto <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={productInputRef}
                type="text"
                value={productQuery}
                onChange={(e) => { setProductQuery(e.target.value); if (linkedProductId) setLinkedProductId(''); setShowProductDropdown(true) }}
                onFocus={() => { if (!linkedProductId) setShowProductDropdown(true) }}
                placeholder="Buscar producto..."
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
              />
              {(productQuery || linkedProductId) && (
                <button type="button" onClick={clearProduct} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {filteredProducts.map((p) => (
                  <button key={p.id} type="button" onClick={() => selectProduct(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl">
                    <span>{p.emoji}</span><span>{p.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {saveError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{saveError}</p>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={saving || !nota.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando...' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterTipo('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !filterTipo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}>Todos</button>
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setFilterTipo(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterTipo === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}>
              {TIPO_ICONS[k]} {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
            <input type="date" value={filterDesde} onChange={(e) => setFilterDesde(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
            <input type="date" value={filterHasta} onChange={(e) => setFilterHasta(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          {(filterDesde || filterHasta) && (
            <div className="flex flex-col justify-end">
              <button onClick={() => { setFilterDesde(''); setFilterHasta('') }}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
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
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <MessageSquare className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">Sin registros</p>
          <p className="mt-1 text-xs text-gray-400">
            {filterTipo || filterDesde || filterHasta ? 'No hay registros con esos filtros' : 'Usá el formulario para agregar tu primer registro'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => {
            const isEditing = editingId === log.id
            const isConfirmingDelete = confirmDeleteId === log.id
            const isDeleting = deletingId === log.id
            const isMine = log.registrado_por === userId
            const wasEdited = log.updated_at && log.updated_at !== log.created_at

            return (
              <div key={log.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">

                {isEditing ? (
                  /* ── Modo edición ─────────────────────────────────── */
                  <div className="p-4 flex flex-col gap-3">
                    {/* Tipo */}
                    <div className="flex flex-wrap gap-2">
                      {(['comentario', 'incidente', 'entrada', 'salida'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setEditTipo(t)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            editTipo === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}>
                          {TIPO_ICONS[t]} {TIPO_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    {/* Textarea */}
                    <textarea
                      value={editNota}
                      onChange={(e) => setEditNota(e.target.value)}
                      rows={3}
                      autoFocus
                      className="rounded-xl border border-indigo-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-indigo-700 dark:bg-gray-800 dark:text-gray-200"
                    />
                    {editError && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">{editError}</p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={cancelEdit}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                        <X className="h-3.5 w-3.5" /> Cancelar
                      </button>
                      <button type="button" onClick={() => saveEdit(log.id)} disabled={savingEdit || !editNota.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        <Check className="h-3.5 w-3.5" /> {savingEdit ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Vista normal ─────────────────────────────────── */
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg leading-none">{TIPO_ICONS[log.tipo]}</span>
                      <div className="min-w-0 flex-1">
                        {/* Badges + autor */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={TIPO_COLORS[log.tipo] as 'success' | 'default' | 'info' | 'danger'} size="sm">
                            {TIPO_LABELS[log.tipo]}
                          </Badge>
                          {log.autor && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              por <span className="font-medium text-gray-600 dark:text-gray-400">{log.autor.nombre} {log.autor.apellido}</span>
                            </span>
                          )}
                        </div>

                        {/* Nota */}
                        <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200">{log.nota}</p>

                        {/* Links (venta / producto) */}
                        {(log.sales || log.products) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {log.sales && (
                              <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                                Venta: {fmt(log.sales.total)}
                              </span>
                            )}
                            {log.products && (
                              <span className="rounded-lg bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
                                {log.products.emoji} {log.products.nombre}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Fechas */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                          <span>Creado: {fmtDate(log.created_at)}</span>
                          {wasEdited && (
                            <span className="text-amber-500 dark:text-amber-400">
                              Editado: {fmtDate(log.updated_at!)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Acciones (solo propios) */}
                      {isMine && !isConfirmingDelete && (
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <button type="button" onClick={() => startEdit(log)} title="Editar"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(log.id)} title="Eliminar"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Confirmar eliminar */}
                    {isConfirmingDelete && (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 dark:border-red-900/40 dark:bg-red-950/20">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400">¿Eliminar este registro?</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                            Cancelar
                          </button>
                          <button type="button" onClick={() => confirmDelete(log.id)} disabled={isDeleting}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {hasMore && (
            <button onClick={() => fetchLogs(page + 1, false)} disabled={loadingMore}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
