'use client'

import { Zap, TrendingUp, Clock, ShoppingBag } from 'lucide-react'
import type { PromoAnalyticsItem } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const HORAS = Array.from({ length: 24 }, (_, i) => i)

function HeatBar({ por_hora }: { por_hora: { hora: number; count: number }[] }) {
  const map = new Map(por_hora.map((h) => [h.hora, h.count]))
  const max = Math.max(...por_hora.map((h) => h.count), 1)

  return (
    <div className="flex items-end gap-px h-8">
      {HORAS.map((h) => {
        const count = map.get(h) ?? 0
        const pct = Math.round((count / max) * 100)
        return (
          <div key={h} className="group relative flex-1" title={`${String(h).padStart(2, '0')}:00 — ${count} veces`}>
            <div
              className="w-full rounded-sm bg-indigo-500 dark:bg-indigo-400 transition-all"
              style={{ height: `${Math.max(pct, count > 0 ? 15 : 4)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

export function PromoAnalytics({ promos }: { promos: PromoAnalyticsItem[] }) {
  if (promos.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Rendimiento de Promos</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="text-3xl mb-2">🎉</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sin ventas con promos en este período</p>
        </div>
      </div>
    )
  }

  const totalMonto = promos.reduce((a, p) => a + p.monto, 0)
  const totalTx = promos.reduce((a, p) => a + p.transacciones, 0)

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Rendimiento de Promos</h2>
          <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
            {promos.length} promo{promos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total promos</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(totalMonto)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ventas</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{totalTx}</p>
          </div>
        </div>
      </div>

      {/* Promo cards */}
      <div className="flex flex-col gap-4">
        {promos.map((promo, idx) => (
          <div
            key={promo.label}
            className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
          >
            {/* Promo header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                  {idx + 1}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {promo.label}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {promo.hora_pico !== null && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pico {String(promo.hora_pico).padStart(2, '0')}:00</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Ingresos
                </span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{fmt(promo.monto)}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {totalMonto > 0 ? Math.round((promo.monto / totalMonto) * 100) : 0}% del total promos
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" /> Ventas
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{promo.transacciones}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {totalTx > 0 ? Math.round((promo.transacciones / totalTx) * 100) : 0}% del total
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Unidades
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{promo.unidades}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {promo.transacciones > 0 ? (promo.unidades / promo.transacciones).toFixed(1) : 0} por venta
                </span>
              </div>
            </div>

            {/* Hourly heatbar */}
            {promo.por_hora.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">
                  Horario de ventas (00–23hs)
                </p>
                <HeatBar por_hora={promo.por_hora} />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-gray-300 dark:text-gray-600">00:00</span>
                  <span className="text-[9px] text-gray-300 dark:text-gray-600">12:00</span>
                  <span className="text-[9px] text-gray-300 dark:text-gray-600">23:00</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
