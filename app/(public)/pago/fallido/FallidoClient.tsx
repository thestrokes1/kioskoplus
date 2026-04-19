'use client'

import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'

export default function PagoFallidoClient() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-9 w-9 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Pago rechazado</h1>
        <p className="mt-2 text-gray-500">
          No se pudo procesar tu pago. Verificá los datos de tu tarjeta o elegí otro método.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Reintentar pago
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  )
}
