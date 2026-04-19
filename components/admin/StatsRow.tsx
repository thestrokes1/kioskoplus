import { TrendingUp, ShoppingBag, Package, Users } from 'lucide-react'

interface Stat {
  label: string
  value: string
  icon: 'ventas' | 'productos' | 'stock' | 'clientes'
  change?: string
  changeType?: 'up' | 'down'
}

interface StatsRowProps {
  stats: Stat[]
}

const icons = {
  ventas: TrendingUp,
  productos: ShoppingBag,
  stock: Package,
  clientes: Users,
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = icons[stat.icon]
        return (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            {stat.change && (
              <p className={`mt-1 text-xs ${stat.changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.changeType === 'up' ? '↑' : '↓'} {stat.change} vs ayer
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
