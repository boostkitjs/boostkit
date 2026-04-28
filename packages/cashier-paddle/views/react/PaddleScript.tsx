import { useEffect } from 'react'
import './paddle.d.ts'

export interface PaddleScriptProps {
  /** Paddle client-side token. */
  token:    string
  /** Use the sandbox environment. */
  sandbox?: boolean
  /** Optional global event listener. */
  onEvent?: (event: { name: string; data?: Record<string, unknown> }) => void
}

const SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'

/**
 * Loads Paddle.js once and initializes it with the given token. Mount this
 * once near the root of your app (or inside any layout that wraps billing
 * pages). It returns `null` — there's no visible markup.
 */
export function PaddleScript({ token, sandbox, onEvent }: PaddleScriptProps): null {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = (): void => {
      const Paddle = window.Paddle
      if (!Paddle) return
      if (sandbox) Paddle.Environment.set('sandbox')
      const initOpts: { token: string; eventCallback?: (event: { name: string; data?: Record<string, unknown> }) => void } = { token }
      if (onEvent) initOpts.eventCallback = onEvent
      Paddle.Initialize(initOpts)
    }

    if (window.Paddle) {
      init()
      return
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src   = SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', init, { once: true })

    return () => {
      script?.removeEventListener('load', init)
    }
  }, [token, sandbox, onEvent])

  return null
}
