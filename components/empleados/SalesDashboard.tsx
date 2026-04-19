'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, BarChart2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Product, CartItem, MetodoPago } from '@/types/index'

interface SalesDashboardProps {
  empleadoId: string
}

export function SalesDashboard({ empleadoId }: SalesDashboardProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [montoPagado, setMontoPagado] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products?activo=true')
    const { data } = (await res.json()) as { data: Product[] }
    if (data) setProducts(data)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filtered = products.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) || p.barcode === search
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && !i.variant)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && !i.variant ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { product, variant: null, cantidad: 1 }]
    })
  }

  const total = cart.reduce((acc, i) => acc + i.product.precio * i.cantidad, 0)
  const vuelto = parseFloat(montoPagado || '0') - total

  async function handleVenta() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleado_id: empleadoId,
          total,
          metodo_pago: metodo,
          estado: 'completada',
          items: cart.map((i) => ({
            product_id: i.product.id,
            variant_id: i.variant?.id ?? null,
            cantidad: i.cantidad,
            precio_unitario: i.product.precio + (i.variant?.precio_extra ?? 0),
            subtotal: (i.product.precio + (i.variant?.precio_extra ?? 0)) * i.cantidad,
          })),
        }),
      })
      const { error } = (await res.json()) as { error?: string }
      if (error) throw new Error(error)
      setCart([])
      setMontoPagado('')
      setSuccessMsg('✅ Venta registrada')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      // error manejado arriba
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="flex h-full gap-6">
      {/* Productos */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const found = products.find((p) => p.barcode === search)
                if (found) addToCart(found)
              }
            }}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock === 0}
              className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white p-3 text-center transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
            >
              <span className="text-3xl">{p.emoji}</span>
              <span className="text-xs font-medium leading-tight text-gray-900">{p.nombre}</span>
              <span className="text-sm font-bold text-blue-700">{fmt(p.precio)}</span>
              {p.stock <= p.stock_minimo && p.stock > 0 && (
                <Badge variant="warning">Stock bajo</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket */}
      <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Ticket</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Sin productos</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cart.map((item) => (
                <li key={`${item.product.id}-${item.variant?.id ?? ''}`} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.product.nombre}</span>
                    <span className="ml-2 text-gray-500">×{item.cantidad}</span>
                  </div>
                  <span className="font-semibold">{fmt(item.product.precio * item.cantidad)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span className="text-lg">{fmt(total)}</span>
          </div>

          <div className="flex gap-2">
            {(['efectivo', 'mercadopago', 'transferencia'] as MetodoPago[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  metodo === m ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600'
                }`}
              >
                {m === 'efectivo' ? '💵' : m === 'mercadopago' ? '💳' : '🏦'}
              </button>
            ))}
          </div>

          {metodo === 'efectivo' && (
            <input
              type="number"
              placeholder="Monto recibido"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          )}

          {metodo === 'efectivo' && parseFloat(montoPagado || '0') > 0 && (
            <p className="text-sm text-center text-green-700 font-medium">
              Vuelto: {fmt(Math.max(0, vuelto))}
            </p>
          )}

          {successMsg && <p className="text-sm text-center text-green-600">{successMsg}</p>}

          <Button
            className="w-full"
            onClick={handleVenta}
            loading={loading}
            disabled={cart.length === 0}
          >
            <Plus className="h-4 w-4" />
            Registrar venta
          </Button>

          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-center text-red-400 hover:text-red-600"
            >
              Limpiar ticket
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
