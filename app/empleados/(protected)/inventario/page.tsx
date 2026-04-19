'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, ScanBarcode, PackageSearch } from 'lucide-react'
import { InventarioTable, TableSkeleton, FILTROS, type FiltroVencimiento } from '@/components/shared/InventarioTable'
import { useBarcodeScanner } from '@/lib/hooks/useBarcodeScanner'
import type { Product, ProductVariant } from '@/types/index'

// ── Scan result overlay ───────────────────────────────────────────────────────

type ScanHit =
  | { found: true;  product: Product; variant?: ProductVariant }
  | { found: false; code: string }

function ScanResultBanner({ hit, onDismiss }: { hit: ScanHit; onDismiss: () => void }) {
  if (!hit.found) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/20">
        <div className="flex items-center gap-3">
          <ScanBarcode className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Código no encontrado</p>
            <p className="text-xs text-red-500 dark:text-red-500 font-mono">{hit.code}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="ml-4 rounded-lg p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const { product, variant } = hit
  const stock = variant ? variant.stock : product.stock
  const stockMin = variant ? variant.stock_minimo : product.stock_minimo
  const stockOk = stock > stockMin
  const stockLow = stock > 0 && stock <= stockMin
  const sinStock = stock === 0

  return (
    <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/50 dark:bg-green-950/20">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{product.emoji}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {product.nombre}
            {variant && <span className="ml-1 text-gray-500 dark:text-gray-400">— {variant.nombre}</span>}
          </p>
          <div className="mt-0.5 flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                sinStock
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                  : stockLow
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              }`}
            >
              {sinStock ? 'Sin stock' : stockLow ? `⚠ Stock bajo: ${stock}` : `Stock: ${stock}`}
            </span>
            {product.categories && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{product.categories.nombre}</span>
            )}
          </div>
        </div>
      </div>
      <button onClick={onDismiss} className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function InventarioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filtro = (searchParams.get('filtro') as FiltroVencimiento) ?? 'todos'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [scanHit, setScanHit] = useState<ScanHit | null>(null)
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/products?activo=true')
    const { data } = (await res.json()) as { data: Product[] }
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showHit(hit: ScanHit) {
    if (scanTimer.current) clearTimeout(scanTimer.current)
    setScanHit(hit)
    scanTimer.current = setTimeout(() => setScanHit(null), 6000)
  }

  function handleBarcodeScan(code: string) {
    // 1. Match product barcode
    const byProduct = products.find((p) => p.barcode === code)
    if (byProduct) {
      showHit({ found: true, product: byProduct })
      return
    }

    // 2. Match variant barcode
    for (const p of products) {
      const v = (p.product_variants ?? []).find((v) => v.barcode === code)
      if (v) {
        showHit({ found: true, product: p, variant: v })
        return
      }
    }

    // 3. Not found
    showHit({ found: false, code })
  }

  useBarcodeScanner(handleBarcodeScan)

  function navigate(key: FiltroVencimiento) {
    router.push(`/empleados/inventario?filtro=${key}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
          <ScanBarcode className="h-3.5 w-3.5" />
          <span>Escáner activo</span>
        </div>
      </div>

      {/* Scan result */}
      {scanHit && (
        <ScanResultBanner hit={scanHit} onDismiss={() => setScanHit(null)} />
      )}

      {/* No products yet but scanner fired */}
      {!loading && products.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-400">
          <PackageSearch className="h-4 w-4 shrink-0" />
          Sin productos cargados — el escáner no puede buscar.
        </div>
      )}

      <InventarioTable
        products={products}
        loading={loading}
        filtro={filtro}
        isAdmin={false}
        onNavigate={navigate}
      />
    </div>
  )
}

export default function EmpleadoInventarioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
          <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">
            {FILTROS.map((f) => (
              <div key={f.key} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600">
                {f.label}
              </div>
            ))}
          </div>
          <TableSkeleton />
        </div>
      }
    >
      <InventarioContent />
    </Suspense>
  )
}
