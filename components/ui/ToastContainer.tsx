'use client'

import { X } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 text-white'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-1 rounded p-0.5 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
