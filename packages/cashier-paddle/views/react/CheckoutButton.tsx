import type { ReactNode, ButtonHTMLAttributes } from 'react'
import './paddle.d.ts'

export interface CheckoutOpenOptions {
  items:       Array<{ priceId: string; quantity: number }>
  settings?:   { successUrl?: string; theme?: 'light' | 'dark' }
  customer?:   { id?: string; email?: string }
  customData?: Record<string, unknown>
  discountId?: string
}

export interface CheckoutButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Serialized checkout options — call `checkout.options()` from the server. */
  checkout: CheckoutOpenOptions
  children?: ReactNode
}

/**
 * Renders a `<button>` that opens Paddle's overlay checkout when clicked.
 *
 * Paddle.js must already be initialized — mount `<PaddleScript token=... />`
 * once at app root.
 *
 * @example
 *   const checkout = await fetch('/api/checkout').then(r => r.json())
 *   <CheckoutButton checkout={checkout}>Buy Pro</CheckoutButton>
 */
export function CheckoutButton({ checkout, children, ...rest }: CheckoutButtonProps): JSX.Element {
  const onClick = (): void => {
    if (typeof window === 'undefined' || !window.Paddle) {
      console.error('[Cashier] Paddle.js not loaded. Mount <PaddleScript /> at app root.')
      return
    }
    window.Paddle.Checkout.open(checkout)
  }

  return (
    <button type="button" onClick={onClick} {...rest}>
      {children ?? 'Checkout'}
    </button>
  )
}
