import { mysqlTable, varchar, text, mediumblob, datetime, index } from 'drizzle-orm/mysql-core'

export const panelVersion = mysqlTable('PanelVersion', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  docName:   varchar('docName', { length: 255 }).notNull(),
  snapshot:  mediumblob('snapshot').notNull(),
  label:     varchar('label', { length: 255 }),
  userId:    varchar('userId', { length: 36 }),
  createdAt: datetime('createdAt').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('panel_version_doc_idx').on(table.docName, table.createdAt),
])

export const panelGlobal = mysqlTable('PanelGlobal', {
  slug:      varchar('slug', { length: 255 }).primaryKey(),
  data:      text('data').notNull().default('{}'),
  updatedAt: datetime('updatedAt').notNull().$defaultFn(() => new Date()),
})

export const aiConversation = mysqlTable('AiConversation', {
  id:            varchar('id', { length: 36 }).primaryKey(),
  userId:        varchar('userId', { length: 36 }),
  title:         varchar('title', { length: 255 }).notNull().default('New conversation'),
  resourceSlug:  varchar('resourceSlug', { length: 255 }),
  recordId:      varchar('recordId', { length: 36 }),
  createdAt:     datetime('createdAt').notNull().$defaultFn(() => new Date()),
  updatedAt:     datetime('updatedAt').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('ai_conv_user_idx').on(table.userId, table.updatedAt),
  index('ai_conv_resource_idx').on(table.resourceSlug, table.recordId, table.updatedAt),
])

export const aiChatMessage = mysqlTable('AiChatMessage', {
  id:              varchar('id', { length: 36 }).primaryKey(),
  conversationId:  varchar('conversationId', { length: 36 }).notNull().references(() => aiConversation.id, { onDelete: 'cascade' }),
  role:            varchar('role', { length: 20 }).notNull(),
  content:         text('content').notNull(),
  toolCalls:       text('toolCalls'),
  toolCallId:      varchar('toolCallId', { length: 255 }),
  createdAt:       datetime('createdAt').notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('ai_msg_conv_idx').on(table.conversationId, table.createdAt),
])
