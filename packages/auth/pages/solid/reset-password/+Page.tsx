import '@/index.css'
import { createSignal, Show } from 'solid-js'

export default function ResetPasswordPage() {
  const [password, setPassword]       = createSignal('')
  const [confirmPassword, setConfirm] = createSignal('')
  const [error, setError]             = createSignal('')
  const [success, setSuccess]         = createSignal('')
  const [loading, setLoading]         = createSignal(false)

  const params = new URLSearchParams(window.location.search)
  const token  = params.get('token')

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password() !== confirmPassword()) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword: password() }),
      })
      if (res.ok) {
        setSuccess('Your password has been reset successfully.')
      } else {
        const body = await res.json().catch(() => ({})) as { message?: string }
        setError(body.message ?? 'Invalid or expired token.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div class="flex min-h-svh items-center justify-center p-4">
      <div class="w-full max-w-sm space-y-6">
        <Show when={token} fallback={
          <div class="space-y-4 rounded-lg border p-6 shadow-sm">
            <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">Missing reset token.</p>
            <p class="text-center text-sm text-gray-500">
              <a href="/forgot-password" class="underline hover:text-black">Request a new reset link</a>
            </p>
          </div>
        }>
          <div class="text-center">
            <h1 class="text-2xl font-bold">Reset password</h1>
            <p class="text-sm text-gray-500 mt-1">Enter your new password</p>
          </div>
          <form onSubmit={handleSubmit} class="space-y-4 rounded-lg border p-6 shadow-sm">
            {error() && <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error()}</p>}
            <Show when={success()} fallback={
              <>
                <div>
                  <label class="block text-sm font-medium mb-1" for="password">New password</label>
                  <input id="password" type="password" placeholder="••••••••"
                    value={password()} onInput={e => setPassword(e.currentTarget.value)}
                    required minLength={8} autocomplete="new-password"
                    class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1" for="confirm-password">Confirm password</label>
                  <input id="confirm-password" type="password" placeholder="••••••••"
                    value={confirmPassword()} onInput={e => setConfirm(e.currentTarget.value)}
                    required minLength={8} autocomplete="new-password"
                    class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black" />
                </div>
                <button type="submit" disabled={loading()}
                  class="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50">
                  {loading() ? 'Resetting...' : 'Reset password'}
                </button>
              </>
            }>
              <div class="space-y-2">
                <p class="rounded-md bg-green-50 px-3 py-2 text-sm text-green-600">{success()}</p>
                <p class="text-center text-sm text-gray-500">
                  <a href="/login" class="underline hover:text-black">Sign in</a>
                </p>
              </div>
            </Show>
          </form>
        </Show>
      </div>
    </div>
  )
}
