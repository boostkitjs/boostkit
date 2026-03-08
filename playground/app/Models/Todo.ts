import { Model } from '@boostkit/orm'

export class Todo extends Model {
  static table = 'todo'

  id!:        string
  title!:     string
  completed!: boolean
  createdAt!: Date
  updatedAt!: Date
}
