import { AlertTriangle, PackageX } from 'lucide-react'
import type { NoMovementItem } from '@/types/index'

interface NoMovementListProps {
  sinMovimiento: NoMovementItem[]
  stockBajo: NoMovementItem[]
}

export function NoMovementList({ sinMovimiento, stockBajo }: NoMovementListProps) {
  const hasNoMovement = sinMovimiento.length > 0
  const hasStockBajo = stockBajo.length > 0

  if (!hasNoMovement && !hasStockBajo) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Alertas de inventario</h2>
        <p className="text-sm text-emerald-600">✓ Sin alertas en este período</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stock bajo — siempre visible */}
      {hasStockBajo && (
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm dark:border-amber-900/30 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Stock bajo{' '}
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {stockBajo.length}
              </span>
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {stockBajo.map((p) => {
              const critico = p.stock === 0
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                    critico ? 'bg-red-50 dark:bg-red-950/20' : 'bg-amber-50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.categoria}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${critico ? 'text-red-600' : 'text-amber-700'}`}
                    >
                      {critico ? 'SIN STOCK' : `${p.stock} u.`}
                    </span>
                    <p className="text-xs text-gray-400">mín. {p.stock_minimo}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sin movimiento en el período */}
      {hasNoMovement && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <PackageX className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Sin ventas en el período{' '}
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                {sinMovimiento.length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sinMovimiento.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800"
              >
                <span className="text-base">{p.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.categoria} · {p.stock} u. en stock</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
