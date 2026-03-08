import { Panel } from '@boostkit/panels'
import { TodoResource } from './resources/TodoResource.js'

export const adminPanel = Panel.make('admin')
  .path('/admin')
  .branding({
    title: 'BoostKit Admin',
  })
  .resources([
    TodoResource,
  ])
