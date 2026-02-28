import type { Application, ServiceProvider } from '@forge/core'
import { DatabaseServiceProvider } from '../app/Providers/DatabaseServiceProvider.js'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
import { AuthServiceProvider } from '../app/Providers/AuthServiceProvider.js'

export default [
  DatabaseServiceProvider,  // must boot first — sets up ModelRegistry
  AppServiceProvider,
  AuthServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
