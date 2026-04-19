'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CategorySalesItem } from '@/types/index'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface CategoryChartProps {
  categorias: CategorySalesItem[]
}

type CatWithPct = CategorySalesItem & { porcentaje?: number }

export function CategoryChart({ categorias }: CategoryChartProps) {
  if (categorias.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Ventas por categoría</h2>
        <p className="text-sm text-gray-400">Sin datos en el período</p>
      </div>
    )
  }

  const totalMonto = categorias.reduce((a, c) => a + c.monto, 0)

  const chartData = categorias.map((c) => ({
    name: `${c.emoji} ${c.nombre}`,
    value: c.monto,
  }))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Ventas por categoría</h2>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Donut chart */}
        <div className="shrink-0">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [fmt(typeof value === 'number' ? value : Number(value)), 'Monto']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-medium text-gray-400">Categoría</th>
                <th className="pb-2 text-right text-xs font-medium text-gray-400">Unidades</th>
                <th className="pb-2 text-right text-xs font-medium text-gray-400">Monto</th>
                <th className="pb-2 text-right text-xs font-medium text-gray-400">%</th>
              </tr>
            </thead>
            <tbody>
              {(categorias as CatWithPct[]).map((c, i) => {
                const pct = totalMonto > 0 ? (c.monto / totalMonto) * 100 : 0
                return (
                  <tr key={c.nombre} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-gray-700">
                          {c.emoji} {c.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600">
                      {new Intl.NumberFormat('es-AR').format(c.unidades)}
                    </td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-900">{fmt(c.monto)}</td>
                    <td className="py-2 text-right text-gray-500">{pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
