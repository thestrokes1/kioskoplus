'use client'

import { useEffect, useRef } from 'react'

/**
 * Detects USB HID barcode scanner input (pistola lectora).
 *
 * A USB scanner acts as a keyboard: it types characters very rapidly
 * (< 50 ms between each keystroke) and ends with Enter. This hook
 * listens globally in the capture phase and fires `onScan(code)` when
 * that pattern is detected. Manual keyboard input (slower) is not affected.
 *
 * Special cases handled:
 * - Enter on `type="number"` or `type="password"` inputs is never intercepted.
 * - Buffer auto-resets 300 ms after the last keystroke (in case Enter is missing).
 * - Disabled automatically when `enabled` is false (e.g. while a modal is open).
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  enabled = true,
) {
  // Keep onScan stable via ref so the effect doesn't re-run on every render
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    if (!enabled) return

    const THRESHOLD_MS = 50  // max gap between scanner keystrokes (ms)
    const MIN_LENGTH   = 3   // minimum barcode length to be considered valid

    let buffer   = ''
    let lastKeyAt = 0
    let clearTimer: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      buffer = ''
      if (clearTimer) { clearTimeout(clearTimer); clearTimer = null }
    }

    const scheduleClear = () => {
      if (clearTimer) clearTimeout(clearTimer)
      clearTimer = setTimeout(flush, 300)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const gap = now - lastKeyAt
      lastKeyAt = now

      if (e.key === 'Enter') {
        const code = buffer.trim()
        flush()

        // Never intercept Enter while user is in a numeric/password field
        const active = document.activeElement as HTMLInputElement | null
        if (active?.type === 'number' || active?.type === 'password') return

        if (code.length >= MIN_LENGTH) {
          e.preventDefault()
          e.stopPropagation()
          onScanRef.current(code)
        }
        return
      }

      // Ignore non-printable keys (Shift, Tab, ArrowUp, etc.)
      if (e.key.length !== 1) {
        scheduleClear()
        return
      }

      // Accumulate on fast keystrokes (scanner); reset buffer on slow ones (manual)
      if (buffer !== '' && gap >= THRESHOLD_MS) {
        buffer = e.key
      } else {
        buffer += e.key
      }

      scheduleClear()
    }

    // Capture phase: intercept before events reach any focused element
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      if (clearTimer) clearTimeout(clearTimer)
    }
  }, [enabled])
}
