import type { Application, ServiceProvider } from '@boostkit/core'
import { events } from '@boostkit/core'
import { auth } from '@boostkit/auth'
import { queue } from '@boostkit/queue'
import { mail } from '@boostkit/mail'
import { cache } from '@boostkit/cache'
import { storage } from '@boostkit/storage'
import { scheduler } from '@boostkit/schedule'
import { notifications } from '@boostkit/notification'
import { session } from '@boostkit/session'
import { localization } from '@boostkit/localization'
import { database } from '@boostkit/orm-prisma'
import { panels } from '@boostkit/panels'
import { dashboard, Widget } from '@boostkit/dashboards'
import { broadcasting } from '@boostkit/broadcast'
import { live }   from '@boostkit/live'
import { adminPanel } from '../app/Panels/Admin/AdminPanel.js'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'
import { TodoServiceProvider } from '../app/Modules/Todo/TodoServiceProvider.js'
import { UserRegistered } from '../app/Events/UserRegistered.js'
import { SendWelcomeEmailListener } from '../app/Listeners/SendWelcomeEmailListener.js'
import configs from '../config/index.js'

export default [
  database(configs.database), // boots first — binds PrismaClient to DI as 'prisma'
  auth(configs.auth),       // auto-discovers 'prisma' from DI
  queue(configs.queue),
  events({ [UserRegistered.name]: [SendWelcomeEmailListener] }),
  mail(configs.mail),
  cache(configs.cache),
  storage(configs.storage),
  session(configs.session),
  localization(configs.localization),
  scheduler(),
  notifications(),
  panels([adminPanel]),
  dashboard({
    widgets: [
      Widget.make('total-articles')
        .label('Total Articles')
        .component('stat')
        .defaultSize('small')
        .icon('📝')
        .data(async () => {
          const { Article } = await import('../app/Models/Article.js')
          return { value: await Article.query().count(), trend: 5 }
        }),
      Widget.make('total-users')
        .label('Total Users')
        .component('stat')
        .defaultSize('small')
        .icon('👥')
        .data(async () => {
          const { User } = await import('../app/Models/User.js')
          return { value: await User.query().count() }
        }),
      Widget.make('articles-chart')
        .label('Articles per Month')
        .component('chart')
        .defaultSize('large')
        .icon('📊')
        .data(async () => ({
          type: 'bar',
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            { label: 'Published', data: [3, 7, 5, 12, 8, 15] },
            { label: 'Drafts', data: [2, 4, 3, 5, 2, 6] },
          ],
        })),
      Widget.make('quick-links')
        .label('Quick Links')
        .component('list')
        .defaultSize('medium')
        .icon('🔗')
        .data(async () => ({
          items: [
            { label: 'Documentation', description: 'Read the docs', href: '/docs', icon: '📖' },
            { label: 'GitHub', href: 'https://github.com/boostkitjs/boostkit', icon: '🐙' },
          ],
        })),
    ],
  }),
  broadcasting(),
  live(configs.live),   // /ws-live — Yjs CRDT sync (after broadcasting so upgrade handler chains correctly)
  // User Providers
  AppServiceProvider,
  TodoServiceProvider,
] satisfies (new (app: Application) => ServiceProvider)[]
