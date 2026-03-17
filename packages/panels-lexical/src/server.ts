/**
 * Server-safe entry point — only exports the ServiceProvider.
 * Import this from bootstrap/providers.ts (Node.js / artisan context).
 * No React or Lexical imports here.
 */
export { PanelLexicalServiceProvider, panelsLexical } from './PanelLexicalServiceProvider.js'
