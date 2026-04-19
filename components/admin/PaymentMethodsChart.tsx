'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PaymentItem } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const METODO_COLORS: Record<string, string> = {
  efectivo: '#10b981',
  mercadopago: '#6366f1',
  transferencia: '#3b82f6',
}

interface PaymentMethodsChartProps {
  pagos: PaymentItem[]
}

export function PaymentMethodsChart({ pagos }: PaymentMethodsChartProps) {
  if (pagos.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Métodos de pago</h2>
        <p className="text-sm text-gray-400">Sin datos en el período</p>
      </div>
    )
  }

  const totalMonto = pagos.reduce((a, p) => a + p.monto, 0)
  const totalCantidad = pagos.reduce((a, p) => a + p.cantidad, 0)

  const chartData = pagos.map((p) => ({ name: p.label, monto: p.monto }))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Métodos de pago</h2>

      <div className="flex flex-col gap-6">
        {/* Cards */}
        <div className="flex flex-wrap gap-3">
          {pagos.map((p) => {
            const pctMonto = totalMonto > 0 ? (p.monto / totalMonto) * 100 : 0
            const pctCant = totalCantidad > 0 ? (p.cantidad / totalCantidad) * 100 : 0
            return (
              <div
                key={p.metodo}
                className="flex flex-1 min-w-[140px] flex-col gap-1 rounded-xl p-4"
                style={{ backgroundColor: (METODO_COLORS[p.metodo] ?? '#6b7280') + '15' }}
              >
                <p className="text-xs font-medium text-gray-500">{p.label}</p>
                <p className="text-lg font-bold text-gray-900">{fmt(p.monto)}</p>
                <p className="text-xs text-gray-500">
                  {p.cantidad} transacc. · {pctMonto.toFixed(1)}%
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pctMonto}%`,
                      backgroundColor: METODO_COLORS[p.metodo] ?? '#6b7280',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat('es-AR', { notation: 'compact', style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v as number)
              }
            />
            <Tooltip
              formatter={(value) => [fmt(typeof value === 'number' ? value : Number(value)), 'Monto']}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            <Bar dataKey="monto" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {chartData.map((entry, idx) => {
                const metodo = pagos[idx]?.metodo ?? ''
                return <Cell key={idx} fill={METODO_COLORS[metodo] ?? '#6b7280'} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
