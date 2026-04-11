import type { Application, ServiceProvider } from '@rudderjs/core'
import { defaultProviders, eventsProvider } from '@rudderjs/core'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'

export default [
  ...(await defaultProviders()),
  eventsProvider({}),
  AppServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
