import type { FormSubmitFn } from './schema/Form.js'

/**
 * @internal — runtime registry of Form submit handlers.
 * Populated by resolveSchema() on the first SSR request that includes the form.
 * Looked up by the form submit API endpoint.
 */
export class FormRegistry {
  private static handlers = new Map<string, FormSubmitFn>()

  static register(panelName: string, formId: string, handler: FormSubmitFn): void {
    FormRegistry.handlers.set(`${panelName}:${formId}`, handler)
  }

  static get(panelName: string, formId: string): FormSubmitFn | undefined {
    return FormRegistry.handlers.get(`${panelName}:${formId}`)
  }

  /** @internal — for testing */
  static reset(): void {
    FormRegistry.handlers.clear()
  }
}
