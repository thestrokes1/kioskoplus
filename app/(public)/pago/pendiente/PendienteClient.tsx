'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock } from 'lucide-react'

function PendienteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <Clock className="h-9 w-9 text-yellow-600" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Pago pendiente</h1>
      <p className="mt-2 text-gray-500">
        Tu pago está siendo procesado. Te notificaremos cuando se confirme.
      </p>

      {paymentId && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
          ID de pago: {paymentId}
        </p>
      )}

      <p className="mt-4 text-sm text-gray-400">
        Si pagaste con efectivo (Rapipago, Pago Fácil, etc.), puede demorar hasta 2 días hábiles.
      </p>

      <button
        onClick={() => router.push('/')}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Volver a la tienda
      </button>
    </div>
  )
}

export default function PagoPendienteClient() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-400">Cargando...</p>
        </div>
      }>
        <PendienteContent />
      </Suspense>
    </div>
  )
}
