import { AlertTriangle } from 'lucide-react'
import type { StockAlert } from '@/types/index'

interface StockAlertsProps {
  alerts: StockAlert[]
}

export function StockAlerts({ alerts }: StockAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Alertas de stock</h3>
        <span className="ml-auto rounded-full bg-yellow-200 dark:bg-yellow-900/50 px-2 py-0.5 text-xs font-bold text-yellow-800 dark:text-yellow-300">
          {alerts.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <span>{a.emoji}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{a.nombre}</span>
            </span>
            <span className="text-yellow-700 dark:text-yellow-400">
              {a.stock === 0 ? (
                <span className="font-bold text-red-600 dark:text-red-400">Sin stock</span>
              ) : (
                <>
                  {a.stock} / mín. {a.stock_minimo}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
