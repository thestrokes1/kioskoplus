'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PeriodPoint } from '@/types/index'

const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface SalesChartProps {
  data: PeriodPoint[]
  desde: string
  hasta: string
}

export function SalesChart({ data, desde, hasta }: SalesChartProps) {
  const diffDays =
    (new Date(hasta).getTime() - new Date(desde).getTime()) / (1000 * 60 * 60 * 24)
  const granLabel = diffDays <= 1 ? 'por hora' : diffDays <= 31 ? 'por día' : 'por mes'

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Evolución de ventas <span className="font-normal text-gray-400">{granLabel}</span>
        </h2>
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">Sin ventas en el período seleccionado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">
        Evolución de ventas{' '}
        <span className="font-normal text-gray-400">{granLabel}</span>
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="monto"
            orientation="left"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat('es-AR', {
                notation: 'compact',
                compactDisplay: 'short',
                style: 'currency',
                currency: 'ARS',
                maximumFractionDigits: 0,
              }).format(v as number)
            }
          />
          <YAxis
            yAxisId="trans"
            orientation="right"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === 'number' ? value : Number(value)
              if (name === 'Monto') return [fmtARS(n), 'Monto']
              return [n, 'Transacciones']
            }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
          <Bar
            yAxisId="monto"
            dataKey="monto"
            name="Monto"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Line
            yAxisId="trans"
            type="monotone"
            dataKey="transacciones"
            name="Transacciones"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f59e0b' }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
