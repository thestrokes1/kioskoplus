import { Clock } from 'lucide-react'

interface HorariosPicoTableProps {
  matrix: number[][] // [24][7] — matrix[hour][displayDay] where displayDay 0=Lun..6=Dom
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function HorariosPicoTable({ matrix }: HorariosPicoTableProps) {
  const flatValues = matrix.flat()
  const totalSales = flatValues.reduce((a, b) => a + b, 0)
  const maxCount = Math.max(...flatValues, 1)

  if (totalSales === 0) return null

  // Only show hours that have at least one sale across the week
  const activeRows = matrix
    .map((row, hour) => ({ row, hour }))
    .filter(({ row }) => row.some((c) => c > 0))

  // Find the hottest cell for highlight
  let hotHour = 0
  let hotDay = 0
  let hotVal = 0
  matrix.forEach((row, h) => {
    row.forEach((c, d) => {
      if (c > hotVal) { hotVal = c; hotHour = h; hotDay = d }
    })
  })

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Horarios pico</h2>
        {hotVal > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            — Pico: {DIAS[hotDay]} {String(hotHour).padStart(2, '0')}:00 ({hotVal} ventas)
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th className="w-14 pb-1 pr-2 text-right text-gray-400 font-normal">Hora</th>
              {DIAS.map((d) => (
                <th key={d} className="pb-1 text-center text-gray-500 dark:text-gray-400 font-medium min-w-[2.5rem]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRows.map(({ row, hour }) => (
              <tr key={hour}>
                <td className="pr-2 py-0.5 text-right text-gray-400 dark:text-gray-500 tabular-nums font-mono">
                  {String(hour).padStart(2, '0')}:00
                </td>
                {row.map((count, day) => {
                  const intensity = count > 0 ? Math.min(count / maxCount, 1) : 0
                  const isHot = count === hotVal && count > 0
                  return (
                    <td
                      key={day}
                      title={count > 0 ? `${DIAS[day]} ${String(hour).padStart(2, '0')}:00 — ${count} venta${count !== 1 ? 's' : ''}` : undefined}
                      style={
                        count > 0
                          ? { backgroundColor: `rgba(99,102,241,${intensity * 0.65 + 0.12})` }
                          : undefined
                      }
                      className={`rounded px-1 py-1 text-center tabular-nums transition-colors ${
                        count > 0
                          ? `font-semibold ${isHot ? 'text-white' : intensity > 0.5 ? 'text-indigo-100' : 'text-indigo-800 dark:text-indigo-200'}`
                          : 'text-gray-200 dark:text-gray-700'
                      }`}
                    >
                      {count > 0 ? count : '·'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
