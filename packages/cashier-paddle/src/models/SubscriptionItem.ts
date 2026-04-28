import { Model } from '@rudderjs/orm'

/** Line item on a Paddle subscription (price × quantity). */
export class SubscriptionItem extends Model {
  static override table = 'paddleSubscriptionItem'

  static override fillable = [
    'subscriptionId', 'productId', 'priceId', 'status', 'quantity',
  ]

  declare id:             string
  declare subscriptionId: string
  declare productId:      string
  declare priceId:        string
  declare status:         string
  declare quantity:       number
  declare createdAt:      Date
  declare updatedAt:      Date
}
