import { useEffect, useRef } from 'react'
import type { CheckoutOpenOptions } from './CheckoutButton.js'
import './paddle.d.ts'

export interface InlineCheckoutProps {
  checkout: CheckoutOpenOptions
  /** Container height in pixels. Default: 450. */
  height?:  number
  /** Container className. */
  className?: string
}

/**
 * Embeds Paddle's checkout iframe inline. Paddle.js must already be loaded
 * via `<PaddleScript />`.
 *
 * @example
 *   <InlineCheckout checkout={await fetch('/api/checkout').then(r => r.json())} />
 */
export function InlineCheckout({ checkout, height = 450, className }: InlineCheckoutProps): JSX.Element {
  const ref  = useRef<HTMLDivElement | null>(null)
  const slot = useRef<string>(`paddle-checkout-${Math.random().toString(36).slice(2, 10)}`)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Paddle || !ref.current) return
    ref.current.id = slot.current

    window.Paddle.Checkout.open({
      ...checkout,
      settings: {
        ...checkout.settings,
        displayMode:        'inline',
        frameTarget:        slot.current,
        frameInitialHeight: height,
        frameStyle:         `width:100%; min-width:312px; background-color:transparent; border:none;`,
      },
    })

    return () => { window.Paddle?.Checkout.close() }
  }, [checkout, height])

  return <div ref={ref} className={className} style={{ minHeight: height }} />
}
