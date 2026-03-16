import { Panel, Heading, Text, Stats, Stat, Table, Chart, List } from '@boostkit/panels'
import { TodoResource }         from './resources/TodoResource.js'
import { UserResource }         from './resources/UserResource.js'
import { ArticleResource }      from './resources/ArticleResource.js'
import { CategoryResource }     from './resources/CategoryResource.js'
import { SiteSettingsGlobal }   from './globals/SiteSettingsGlobal.js'
import { CustomPage } from './pages/CustomPage.js'
import { Article }    from '../../Models/Article.js'
import { Category }   from '../../Models/Category.js'
import { Todo }       from '../../Models/Todo.js'
import { User }       from '../../Models/User.js'

export const adminPanel = Panel.make('admin')
  .path('/admin')
  .branding({
    title: 'BoostKit',
    logo: '/logo.svg',
  })
  .layout('sidebar')
  .locale('en')
  // .guard(async (ctx) => ctx.user?.role === 'admin')
  .resources([
    ArticleResource,
    CategoryResource,
    TodoResource,
    UserResource,
  ])
  .globals([
    SiteSettingsGlobal,
  ])
  .schema(async (ctx) => [
    Heading.make(`Welcome back${ctx.user?.name ? `, ${ctx.user.name}` : ''}.`),
    Text.make('Here\'s a quick overview of your content.'),
    Stats.make([
      Stat.make('Articles').value(await Article.query().count()),
      Stat.make('Categories').value(await Category.query().count()),
      Stat.make('Todos').value(await Todo.query().count()),
      Stat.make('Users').value(await User.query().count()),
    ]),
    Chart.make('Articles per Month')
      .chartType('bar')
      .labels(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'])
      .datasets([
        { label: 'Published', data: [3, 7, 5, 12, 8, 15] },
        { label: 'Drafts', data: [2, 4, 3, 5, 2, 6] },
      ]),
    Table.make('Recent Articles')
      .resource('articles')
      .columns(['title', 'status', 'createdAt'])
      .limit(5),
    List.make('Quick Links')
      .items([
        { label: 'Documentation', description: 'Read the BoostKit docs', href: '/docs', icon: '📖' },
        { label: 'GitHub', description: 'View source code', href: 'https://github.com/boostkitjs/boostkit', icon: '🐙' },
        { label: 'Support', description: 'Get help', href: '/contact', icon: '💬' },
      ]),
  ])
  .pages([
    CustomPage,
  ])