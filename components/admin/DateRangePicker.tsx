'use client'

import { useRouter, usePathname } from 'next/navigation'

interface DateRangePickerProps {
  desde: string
  hasta: string
}

function toArgentinaISOStart(date: Date): string {
  // Offset Argentina UTC-3: set time to 00:00:00 Argentina = 03:00:00 UTC
  const d = new Date(date)
  d.setUTCHours(3, 0, 0, 0)
  return d.toISOString()
}

function toArgentinaISOEnd(date: Date): string {
  // End of day Argentina = 02:59:59 UTC next day
  const d = new Date(date)
  d.setUTCHours(26, 59, 59, 999) // 26:59 UTC = next day 02:59 UTC = 23:59 Argentina
  return d.toISOString()
}

function toDateInput(iso: string): string {
  // Convert ISO to YYYY-MM-DD for date input (Argentina local)
  const d = new Date(iso)
  const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000) // subtract 3h for AR
  return ar.toISOString().slice(0, 10)
}

const PRESETS = [
  { label: 'Hoy', key: 'hoy' },
  { label: 'Ayer', key: 'ayer' },
  { label: 'Últimos 7 días', key: '7dias' },
  { label: 'Esta semana', key: 'semana' },
  { label: 'Este mes', key: 'mes' },
  { label: 'Este año', key: 'anio' },
]

export function DateRangePicker({ desde, hasta }: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(d: string, h: string) {
    router.push(`${pathname}?desde=${encodeURIComponent(d)}&hasta=${encodeURIComponent(h)}`)
  }

  function handlePreset(key: string) {
    const now = new Date()
    // Work in Argentina time (UTC-3)
    const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const y = arNow.getUTCFullYear()
    const m = arNow.getUTCMonth()
    const d = arNow.getUTCDate()
    const dow = arNow.getUTCDay() // 0=Sun

    let desdeDate: Date, hastaDate: Date

    if (key === 'hoy') {
      desdeDate = new Date(Date.UTC(y, m, d, 3, 0, 0, 0))
      hastaDate = new Date(Date.UTC(y, m, d + 1, 2, 59, 59, 999))
    } else if (key === 'ayer') {
      desdeDate = new Date(Date.UTC(y, m, d - 1, 3, 0, 0, 0))
      hastaDate = new Date(Date.UTC(y, m, d, 2, 59, 59, 999))
    } else if (key === '7dias') {
      desdeDate = new Date(Date.UTC(y, m, d - 7, 3, 0, 0, 0))
      hastaDate = new Date(Date.UTC(y, m, d + 1, 2, 59, 59, 999))
    } else if (key === 'semana') {
      const daysBack = dow === 0 ? 6 : dow - 1
      const daysToSunday = dow === 0 ? 0 : 7 - dow
      desdeDate = new Date(Date.UTC(y, m, d - daysBack, 3, 0, 0, 0))
      hastaDate = new Date(Date.UTC(y, m, d + daysToSunday + 1, 2, 59, 59, 999))
    } else if (key === 'mes') {
      desdeDate = new Date(Date.UTC(y, m, 1, 3, 0, 0, 0))
      hastaDate = new Date(Date.UTC(y, m, d + 1, 2, 59, 59, 999))
    } else {
      // anio
      desdeDate = new Date(Date.UTC(y, 0, 1, 3, 0, 0, 0))
      hastaDate = new Date(Date.UTC(y, m, d + 1, 2, 59, 59, 999))
    }

    navigate(desdeDate.toISOString(), hastaDate.toISOString())
  }

  function handleDesde(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [y, mo, day] = e.target.value.split('-').map(Number)
    const d = new Date(Date.UTC(y, mo - 1, day, 3, 0, 0, 0))
    navigate(d.toISOString(), hasta)
  }

  function handleHasta(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [y, mo, day] = e.target.value.split('-').map(Number)
    const d = new Date(Date.UTC(y, mo - 1, day + 1, 2, 59, 59, 999))
    navigate(desde, d.toISOString())
  }

  function isActive(key: string): boolean {
    const now = new Date()
    const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const y = arNow.getUTCFullYear()
    const m = arNow.getUTCMonth()
    const d = arNow.getUTCDate()

    const desdeD = toDateInput(desde)
    const hastaD = toDateInput(hasta)

    if (key === 'hoy') {
      const today = new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
      return desdeD === today && hastaD === today
    }
    if (key === 'ayer') {
      const yesterday = new Date(Date.UTC(y, m, d - 1)).toISOString().slice(0, 10)
      return desdeD === yesterday && hastaD === yesterday
    }
    if (key === '7dias') {
      const d7ago = new Date(Date.UTC(y, m, d - 7)).toISOString().slice(0, 10)
      const today = new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
      return desdeD === d7ago && hastaD === today
    }
    if (key === 'semana') {
      const dow = arNow.getUTCDay()
      const daysBack = dow === 0 ? 6 : dow - 1
      const daysToSunday = dow === 0 ? 0 : 7 - dow
      const monday = new Date(Date.UTC(y, m, d - daysBack)).toISOString().slice(0, 10)
      const sunday = new Date(Date.UTC(y, m, d + daysToSunday)).toISOString().slice(0, 10)
      return desdeD === monday && hastaD === sunday
    }
    if (key === 'mes') {
      const firstDay = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)
      const today = new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
      return desdeD === firstDay && hastaD === today
    }
    if (key === 'anio') {
      const firstDay = new Date(Date.UTC(y, 0, 1)).toISOString().slice(0, 10)
      const today = new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
      return desdeD === firstDay && hastaD === today
    }
    return false
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick presets */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive(p.key)
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5">
        <input
          type="date"
          value={toDateInput(desde)}
          onChange={handleDesde}
          className="text-xs text-gray-700 outline-none [color-scheme:light]"
        />
        <span className="text-xs text-gray-400">→</span>
        <input
          type="date"
          value={toDateInput(hasta)}
          onChange={handleHasta}
          className="text-xs text-gray-700 outline-none [color-scheme:light]"
        />
      </div>
    </div>
  )
}
