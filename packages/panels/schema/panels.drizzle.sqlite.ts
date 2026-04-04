import { sqliteTable, text, blob, integer, index } from 'drizzle-orm/sqlite-core'

export const panelVersion = sqliteTable('PanelVersion', {
  id:        text('id').primaryKey(),
  docName:   text('docName').notNull(),
  snapshot:  blob('snapshot', { mode: 'buffer' }).notNull(),
  label:     text('label'),
  userId:    text('userId'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('panel_version_doc_idx').on(table.docName, table.createdAt),
])

export const panelGlobal = sqliteTable('PanelGlobal', {
  slug:      text('slug').primaryKey(),
  data:      text('data').notNull().default('{}'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const aiConversation = sqliteTable('AiConversation', {
  id:            text('id').primaryKey(),
  userId:        text('userId'),
  title:         text('title').notNull().default('New conversation'),
  resourceSlug:  text('resourceSlug'),
  recordId:      text('recordId'),
  createdAt:     integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt:     integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('ai_conv_user_idx').on(table.userId, table.updatedAt),
  index('ai_conv_resource_idx').on(table.resourceSlug, table.recordId, table.updatedAt),
])

export const aiChatMessage = sqliteTable('AiChatMessage', {
  id:              text('id').primaryKey(),
  conversationId:  text('conversationId').notNull().references(() => aiConversation.id, { onDelete: 'cascade' }),
  role:            text('role').notNull(),
  content:         text('content').notNull(),
  toolCalls:       text('toolCalls'),
  toolCallId:      text('toolCallId'),
  createdAt:       integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('ai_msg_conv_idx').on(table.conversationId, table.createdAt),
])
