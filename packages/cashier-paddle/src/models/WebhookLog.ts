import { Model } from '@rudderjs/orm'

/** Idempotency log — one row per processed Paddle event id. */
export class WebhookLog extends Model {
  static override table = 'paddleWebhookLog'

  static override fillable = ['eventId', 'eventType', 'processedAt']

  declare eventId:     string
  declare eventType:   string
  declare processedAt: Date
}
