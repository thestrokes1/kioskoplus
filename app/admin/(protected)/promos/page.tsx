'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { PromoForm } from '@/components/admin/PromoForm'
import { calcPromo } from '@/types/index'
import type { Promo } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Promo list card ───────────────────────────────────────────────────────────

function PromoListCard({
  promo,
  onEdit,
  onDelete,
  onToggle,
}: {
  promo: Promo
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const { precioOriginal, precioFinal, ahorro } = calcPromo(promo)
  const items = promo.promo_items ?? []

  return (
    <div className={`rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden transition-opacity ${
      promo.activo ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-4">
        <span className="text-2xl leading-none">{promo.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
              #{promo.numero}
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{promo.nombre}</h3>
            <span className="shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              {promo.pct_descuento}% OFF
            </span>
          </div>
          {promo.descripcion && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{promo.descripcion}</p>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={promo.activo ? 'Desactivar' : 'Activar'}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {promo.activo
              ? <ToggleRight className="h-5 w-5 text-indigo-600" />
              : <ToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="px-5 py-3">
        <div className="space-y-1">
          {items.map((item, i) => {
            const prod = item.products
            if (!prod) return null
            const precioUnit = item.product_variants?.precio_variante ?? prod.precio
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-base leading-none">{prod.emoji}</span>
                <span className="flex-1 text-gray-700 dark:text-gray-300">
                  {prod.nombre}
                  {item.product_variants && (
                    <span className="text-gray-400"> — {item.product_variants.nombre}</span>
                  )}
                  {item.cantidad > 1 && (
                    <span className="text-gray-400"> ×{item.cantidad}</span>
                  )}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{fmt(precioUnit * item.cantidad)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Price summary */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="line-through">{fmt(precioOriginal)}</span>
            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
              − {fmt(ahorro)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{fmt(precioFinal)}</p>
            {promo.fecha_inicio || promo.fecha_fin ? (
              <p className="text-xs text-gray-400">
                {promo.fecha_inicio ?? '∞'} → {promo.fecha_fin ?? '∞'}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────���────────────────────────────────────

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [allPromos, setAllPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Promo | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    // Fetch ALL promos (admin needs to see inactive too)
    const supaRes = await fetch('/api/promos/admin')
    const { data } = (await supaRes.json()) as { data: Promo[] }
    const list = data ?? []
    setAllPromos(list)
    setPromos(showInactive ? list : list.filter((p) => p.activo))
    setLoading(false)
  }, [showInactive])

  useEffect(() => { fetchPromos() }, [fetchPromos])

  useEffect(() => {
    setPromos(showInactive ? allPromos : allPromos.filter((p) => p.activo))
  }, [showInactive, allPromos])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta promo? Esta acción no se puede deshacer.')) return
    await fetch(`/api/promos/${id}`, { method: 'DELETE' })
    fetchPromos()
  }

  async function handleToggle(promo: Promo) {
    await fetch(`/api/promos/${promo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !promo.activo }),
    })
    fetchPromos()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Promos</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Combos con descuento que se muestran en la tienda y el POS
          </p>
        </div>
        <button
          onClick={() => setIsNew(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva promo
        </button>
      </div>

      {/* Toggle inactive */}
      <label className="flex w-fit cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar inactivas</span>
      </label>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-20 text-center">
          <Tag className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {showInactive ? 'Sin promos cargadas' : 'Sin promos activas'}
          </p>
          <button
            onClick={() => setIsNew(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Crear primera promo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((promo) => (
            <PromoListCard
              key={promo.id}
              promo={promo}
              onEdit={() => setEditing(promo)}
              onDelete={() => handleDelete(promo.id)}
              onToggle={() => handleToggle(promo)}
            />
          ))}
        </div>
      )}

      {/* Modal create/edit */}
      <Modal
        open={isNew || !!editing}
        onClose={() => { setEditing(null); setIsNew(false) }}
        title={editing ? `Editar: ${editing.nombre}` : 'Nueva promo'}
        maxWidth="lg"
      >
        <PromoForm
          promo={editing ?? undefined}
          onSuccess={() => { setEditing(null); setIsNew(false); fetchPromos() }}
          onCancel={() => { setEditing(null); setIsNew(false) }}
        />
      </Modal>
    </div>
  )
}
