import type { Mailable } from './mailable.js'

// ─── Mail Preview ───────────────────────────────────────────

/**
 * Renders a mailable as HTML in the browser for development preview.
 * Returns a route handler that compiles the mailable and serves the HTML.
 *
 * @example
 * import { mailPreview } from '@rudderjs/mail'
 * import { WelcomeEmail } from '../app/Mail/WelcomeEmail.js'
 *
 * // In routes/web.ts (only in development):
 * if (process.env.NODE_ENV !== 'production') {
 *   router.get('/mail-preview/welcome', mailPreview(() => new WelcomeEmail(sampleUser)))
 * }
 */
export function mailPreview(
  factory: () => Mailable | Promise<Mailable>,
): (_req: unknown, res: { status(code: number): { send(body: string): void }; headers?: Record<string, string> }) => Promise<void> {
  return async (_req, res) => {
    try {
      const mailable = await factory()
      const msg      = await mailable.compile()
      const html     = msg.html ?? `<pre>${msg.text ?? '(no content)'}</pre>`

      // Wrap in a preview shell with subject header
      const preview = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mail Preview: ${_escHtml(msg.subject)}</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #e5e5e5; }
    .preview-bar { padding: 12px 24px; background: #1a1a2e; color: #fff; font-size: 13px; display: flex; gap: 24px; align-items: center; }
    .preview-bar strong { color: #a78bfa; }
    .preview-frame { max-width: 640px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .preview-content { padding: 0; }
    .preview-content iframe { width: 100%; height: 80vh; border: none; }
  </style>
</head>
<body>
  <div class="preview-bar">
    <span><strong>Subject:</strong> ${_escHtml(msg.subject)}</span>
    <span><strong>Type:</strong> ${msg.html ? 'HTML' : 'Plain Text'}</span>
  </div>
  <div class="preview-frame">
    <div class="preview-content">
      <iframe srcdoc="${_escAttr(html)}"></iframe>
    </div>
  </div>
</body>
</html>`

      res.status(200).send(preview)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.status(500).send(`<pre>Mail preview error:\n${_escHtml(message)}</pre>`)
    }
  }
}

function _escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function _escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
