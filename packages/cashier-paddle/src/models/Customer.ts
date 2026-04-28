import { Model } from '@rudderjs/orm'

/**
 * Paddle customer — joins your billable model to Paddle's customer record.
 *
 * NOTE: `static table` is the **Prisma delegate name** (camelCase), not the
 * SQL table from `@@map`. The ORM does `prisma[this.table]`.
 *
 * NOTE: ORM queries return plain records, NOT Model instances. Treat instance
 * methods on this class as documentation; for runtime behavior use the helpers
 * in `models/helpers.ts` (`customerHelpers.*`).
 */
export class Customer extends Model {
  static override table = 'paddleCustomer'

  static override fillable = [
    'paddleId', 'billableId', 'billableType', 'name', 'email', 'trialEndsAt',
  ]

  declare id:           string
  declare paddleId:     string | null
  declare billableId:   string
  declare billableType: string
  declare name:         string | null
  declare email:        string | null
  declare trialEndsAt:  Date | null
  declare createdAt:    Date
  declare updatedAt:    Date
}
