'use client'

import { useRef, useState } from 'react'
import { ScanLine } from 'lucide-react'
import type { Product } from '@/types/index'

interface ScannerProps {
  onScan: (product: Product) => void
}

export function Scanner({ onScan }: ScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [error, setError] = useState('')

  async function handleScan(code: string) {
    if (!code.trim()) return
    setError('')
    const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`)
    const { data, error: apiError } = (await res.json()) as { data?: Product[]; error?: string }
    if (apiError || !data?.length) {
      setError(`Producto no encontrado: ${code}`)
      setBarcode('')
      inputRef.current?.focus()
      return
    }
    onScan(data[0])
    setBarcode('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <ScanLine className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleScan(barcode)
            }
          }}
          placeholder="Escaneá o escribí el código de barras..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-blue-400"
          autoFocus
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">
        Apuntá el lector USB aquí o escribí el código y presioná Enter
      </p>
    </div>
  )
}
