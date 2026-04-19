'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { CheckCircle } from 'lucide-react'

function ExitosoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clearCart = useCartStore((s) => s.clearCart)

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')

  useEffect(() => {
    if (status === 'approved') {
      clearCart()
    }
  }, [status, clearCart])

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-9 w-9 text-green-600" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">¡Pago exitoso!</h1>
      <p className="mt-2 text-gray-500">
        Tu compra fue procesada correctamente.
      </p>

      {paymentId && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
          ID de pago: {paymentId}
        </p>
      )}

      <button
        onClick={() => router.push('/')}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Volver a la tienda
      </button>
    </div>
  )
}

export default function PagoExitosoClient() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-400">Procesando...</p>
        </div>
      }>
        <ExitosoContent />
      </Suspense>
    </div>
  )
}
