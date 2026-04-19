import { TrendingUp, TrendingDown, Minus, ShoppingCart, Receipt, Package, Clock } from 'lucide-react'
import type { AnalyticsKPI } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)

function Delta({ current, prev, currency = false }: { current: number; prev: number; currency?: boolean }) {
  if (prev === 0) return <span className="text-xs text-gray-400">Sin datos anteriores</span>
  const pct = ((current - prev) / prev) * 100
  const up = pct >= 0
  const neutral = Math.abs(pct) < 0.5

  if (neutral) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Minus className="h-3 w-3" />
        Sin cambio
      </span>
    )
  }

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{pct.toFixed(1)}% vs período anterior
    </span>
  )
}

interface KPICardsProps {
  kpi: AnalyticsKPI
}

export function KPICards({ kpi }: KPICardsProps) {
  const cards = [
    {
      label: 'Total vendido',
      value: fmt(kpi.total_vendido),
      icon: <Receipt className="h-5 w-5 text-indigo-600" />,
      bg: 'bg-indigo-50',
      delta: <Delta current={kpi.total_vendido} prev={kpi.prev_total_vendido} currency />,
    },
    {
      label: 'Transacciones',
      value: fmtNum(kpi.transacciones),
      icon: <ShoppingCart className="h-5 w-5 text-violet-600" />,
      bg: 'bg-violet-50',
      delta: <Delta current={kpi.transacciones} prev={kpi.prev_transacciones} />,
    },
    {
      label: 'Ticket promedio',
      value: fmt(kpi.ticket_promedio),
      icon: <Receipt className="h-5 w-5 text-sky-600" />,
      bg: 'bg-sky-50',
      delta: null,
    },
    {
      label: 'Unidades vendidas',
      value: fmtNum(kpi.unidades_totales),
      icon: <Package className="h-5 w-5 text-amber-600" />,
      bg: 'bg-amber-50',
      delta: null,
    },
    {
      label: 'Hora pico',
      value:
        kpi.hora_pico !== null
          ? `${String(kpi.hora_pico).padStart(2, '0')}:00 hs`
          : '—',
      icon: <Clock className="h-5 w-5 text-rose-600" />,
      bg: 'bg-rose-50',
      delta: null,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg} dark:bg-opacity-20`}>
            {card.icon}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
          </div>
          {card.delta && <div>{card.delta}</div>}
        </div>
      ))}
    </div>
  )
}
