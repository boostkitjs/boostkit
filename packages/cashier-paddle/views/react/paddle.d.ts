// Ambient declarations for Paddle.js (loaded via <script> in the host page).
// Imported indirectly by CheckoutButton/InlineCheckout — apps may also reference
// `window.Paddle` themselves once Paddle.js is on the page.

declare global {
  interface Window {
    Paddle?: PaddleJs
  }
}

export interface PaddleJs {
  Environment: {
    set(env: 'sandbox' | 'production'): void
  }
  Initialize(opts: { token: string; eventCallback?: (event: PaddleEvent) => void }): void
  Checkout: {
    open(opts: PaddleCheckoutOpenOptions): void
    close(): void
  }
}

export interface PaddleCheckoutOpenOptions {
  items:        Array<{ priceId: string; quantity: number }>
  settings?:    {
    successUrl?:    string
    displayMode?:   'inline' | 'overlay'
    frameTarget?:   string
    frameInitialHeight?: number
    frameStyle?:    string
    theme?:         'light' | 'dark'
  }
  customer?:    { id?: string; email?: string; address?: Record<string, string> }
  customData?:  Record<string, unknown>
  discountId?:  string
}

export interface PaddleEvent {
  name: string
  data?: Record<string, unknown>
}
