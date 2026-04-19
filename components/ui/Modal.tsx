'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
}

export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          relative w-full flex flex-col bg-white dark:bg-gray-900 shadow-2xl
          /* mobile: bottom sheet, full width, rounded top */
          rounded-t-2xl max-h-[92vh]
          /* desktop: centered, rounded all, constrained width, margin */
          sm:rounded-2xl sm:mx-4 sm:max-h-[90vh]
          ${maxWidthClasses[maxWidth]}
        `}
      >
        {/* Header — fixed, doesn't scroll */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
            {/* Mobile drag handle */}
            <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-200 dark:bg-gray-700 sm:hidden" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
