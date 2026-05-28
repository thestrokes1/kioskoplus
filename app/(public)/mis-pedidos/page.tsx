'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Sale } from '@/types/index'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function EstadoBadge({ sale }: { sale: Sale }) {
  if (sale.estado === 'cancelada') return <Badge variant="danger">Cancelada</Badge>
  if (sale.mp_status === 'rejected') return <Badge variant="danger">Rechazado</Badge>
  if (sale.mp_status === 'pending') return <Badge variant="warning">Pendiente pago</Badge>
  if (sale.mp_status === 'approved' || sale.metodo_pago === 'efectivo' || sale.metodo_pago === 'transferencia') {
    return <Badge variant="success">Completada</Badge>
  }
  return <Badge variant="default">{sale.estado}</Badge>
}

function EstadoIcon({ sale }: { sale: Sale }) {
  if (sale.estado === 'cancelada' || sale.mp_status === 'rejected') {
    return <XCircle className="h-5 w-5 text-red-500" />
  }
  if (sale.mp_status === 'pending') {
    return <AlertCircle className="h-5 w-5 text-amber-500" />
  }
  return <CheckCircle className="h-5 w-5 text-emerald-500" />
}

type SaleWithItems = Sale & {
  sale_items?: Array<{
    id: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    products?: { nombre: string; emoji: string } | null
    product_variants?: { nombre: string } | null
  }>
}

export default function MisPedidosPage() {
  const router = useRouter()
  const [sales, setSales] = useState<SaleWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mis-pedidos')
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then((json) => {
        if (!json) return
        if (json.error) { setError(json.error); return }
        setSales(json.data ?? [])
      })
      .catch(() => setError('Error al cargar pedidos'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Mis pedidos</h1>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mis pedidos</h1>
        <span className="text-sm text-gray-400">{sales.length} pedidos</span>
      </div>

      {sales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No tenés pedidos todavía</p>
          <a href="/tienda" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">
            Ir a la tienda →
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sales.map((sale) => (
            <div key={sale.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <EstadoIcon sale={sale} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Pedido #{sale.id.slice(0, 8).toUpperCase()}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(sale.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <EstadoBadge sale={sale} />
              </div>

              {/* Items */}
              {(sale.sale_items ?? []).length > 0 && (
                <div className="mb-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="flex flex-col gap-1.5">
                    {sale.sale_items!.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">
                          {item.products?.emoji ?? '📦'} {item.products?.nombre ?? 'Producto'}
                          {item.product_variants?.nombre && (
                            <span className="text-gray-400"> — {item.product_variants.nombre}</span>
                          )}
                          {' '}× {item.cantidad}
                        </span>
                        <span className="font-medium text-gray-900">{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 capitalize">{sale.metodo_pago}</span>
                </div>
                <p className="text-base font-bold text-gray-900">{fmt(sale.total)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
