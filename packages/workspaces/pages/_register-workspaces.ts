import { registerLazyElement, registerField } from '@boostkit/panels'

// Register Canvas schema element (lazy-loaded, SSR-safe)
registerLazyElement('canvas', () =>
  import('./_components/canvas/WorkspaceCanvas.js').then(m => ({
    default: (m as Record<string, unknown>).WorkspaceCanvas as React.ComponentType,
  }))
)

// Register Chat schema element (lazy-loaded, SSR-safe)
registerLazyElement('chat', () =>
  import('./_components/chat/ChatPanel.js').then(m => ({
    default: (m as Record<string, unknown>).ChatPanel as React.ComponentType,
  }))
)

// Register CanvasField input component
registerField('canvas', () =>
  import('./_components/canvas/WorkspaceCanvas.js').then(m => ({
    default: (m as Record<string, unknown>).WorkspaceCanvas as React.ComponentType,
  }))
)

// Register ChatField input component
registerField('chat', () =>
  import('./_components/chat/ChatPanel.js').then(m => ({
    default: (m as Record<string, unknown>).ChatPanel as React.ComponentType,
  }))
)
