import { AiRegistry } from './registry.js'
import type { SpeechToTextResult } from './types.js'

/**
 * Fluent builder for speech-to-text transcription.
 *
 * @example
 * const result = await Transcription.fromBytes(bytes).language('en').generate()
 *
 * For Node-only path-based loading, see `@rudderjs/ai/node`:
 *   const t = await transcribeFromPath('./audio.mp3')
 */
export class Transcription {
  private _model?: string
  private _language?: string
  private _prompt?: string

  private constructor(private readonly _audio: Uint8Array) {}

  /** Create a Transcription from raw audio bytes */
  static fromBytes(bytes: Uint8Array): Transcription {
    return new Transcription(bytes)
  }

  /** @deprecated Use fromBytes(). Buffer extends Uint8Array, so this is a thin alias. */
  static fromBuffer(buffer: Uint8Array): Transcription {
    return new Transcription(buffer)
  }

  /** Set the STT model (e.g. 'openai/whisper-1') */
  model(m: string): this {
    this._model = m
    return this
  }

  /** Set the language hint (ISO-639-1, e.g. 'en', 'es', 'fr') */
  language(l: string): this {
    this._language = l
    return this
  }

  /** Set an optional prompt to guide transcription style */
  prompt(p: string): this {
    this._prompt = p
    return this
  }

  /** Run the transcription */
  async generate(): Promise<SpeechToTextResult> {
    const modelString = this._model ?? AiRegistry.getDefault()
    const [providerName, modelId] = AiRegistry.parseModelString(modelString)
    const factory = AiRegistry.getFactory(providerName)

    if (!factory.createStt) {
      throw new Error(
        `[RudderJS AI] Provider "${providerName}" does not support speech-to-text. ` +
        `Use a provider that implements createStt() (e.g. openai).`,
      )
    }

    const adapter = factory.createStt(modelId)
    return adapter.transcribe({
      audio: this._audio,
      model: modelId,
      language: this._language,
      prompt: this._prompt,
    })
  }
}
