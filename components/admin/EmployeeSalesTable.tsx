import type { EmployeeSalesItem } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface EmployeeSalesTableProps {
  empleados: EmployeeSalesItem[]
}

export function EmployeeSalesTable({ empleados }: EmployeeSalesTableProps) {
  if (empleados.length <= 1) return null

  const totalMonto = empleados.reduce((a, e) => a + e.monto, 0)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ventas por empleado</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="pb-2 text-left text-xs font-medium text-gray-400">Empleado</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Ventas</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Total</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">Ticket prom.</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-400">% del total</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((e, i) => {
              const pct = totalMonto > 0 ? (e.monto / totalMonto) * 100 : 0
              return (
                <tr key={i} className="border-b border-gray-50 last:border-0 dark:border-gray-800">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                        {(e.nombre?.[0] ?? '?').toUpperCase()}
                        {(e.apellido?.[0] ?? '').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {e.nombre} {e.apellido ?? ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-700 dark:text-gray-300">
                    {new Intl.NumberFormat('es-AR').format(e.ventas)}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(e.monto)}</td>
                  <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400">{fmt(e.ticket)}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
