import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ProductRankingItem } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface ProductRankingProps {
  productos: ProductRankingItem[]
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null
  const pct = ((current - prev) / prev) * 100
  if (Math.abs(pct) < 5) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="h-3 w-3" />
      </span>
    )
  }
  if (pct > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        +{pct.toFixed(0)}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-500">
      <TrendingDown className="h-3 w-3" />
      {pct.toFixed(0)}%
    </span>
  )
}

export function ProductRanking({ productos }: ProductRankingProps) {
  if (productos.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Top 10 productos</h2>
        <p className="text-sm text-gray-400">Sin ventas en el período</p>
      </div>
    )
  }

  const maxUnidades = productos[0]?.unidades ?? 1

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Top 10 productos más vendidos</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="pb-2 text-left text-xs font-medium text-gray-400">#</th>
              <th className="pb-2 text-left text-xs font-medium text-gray-400">Producto</th>
              <th className="pb-2 text-left text-xs font-medium text-gray-400 hidden sm:table-cell">Categoría</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Unidades</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400 hidden md:table-cell">Monto</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Tend.</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 dark:border-gray-800">
                <td className="py-3 pr-2 text-xs text-gray-400">{i + 1}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{p.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-900 leading-tight dark:text-gray-100">{p.nombre}</p>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${(p.unidades / maxUnidades) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 hidden sm:table-cell">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    {p.categoria}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {new Intl.NumberFormat('es-AR').format(p.unidades)}
                </td>
                <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400 hidden md:table-cell">
                  {fmt(p.monto)}
                </td>
                <td className="py-3 text-right">
                  <TrendBadge current={p.unidades} prev={p.prev_unidades} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
