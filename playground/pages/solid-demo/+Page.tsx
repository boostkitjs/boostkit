import { createSignal } from 'solid-js'

export default function Page() {
  const [count, setCount] = createSignal(0)

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '80px auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>Solid Demo</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        This page is rendered with <strong>SolidJS</strong> via <code>vike-solid</code>.<br />
        The rest of the app uses React — per-page <code>+config.ts</code> controls the framework.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button
          style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '1rem' }}
          onClick={() => setCount(c => c - 1)}
        >−</button>
        <span style={{ fontSize: '1.5rem', fontWeight: '600', minWidth: '40px' }}>{count()}</span>
        <button
          style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '1rem' }}
          onClick={() => setCount(c => c + 1)}
        >+</button>
      </div>

      <p style={{ marginTop: '40px' }}>
        <a href="/" style={{ color: '#888', fontSize: '0.9rem' }}>← Back to home</a>
      </p>
    </div>
  )
}
