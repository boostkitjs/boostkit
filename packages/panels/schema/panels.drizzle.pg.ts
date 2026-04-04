import { pgTable, text, bytea, timestamp, index } from 'drizzle-orm/pg-core'

export const panelVersion = pgTable('PanelVersion', {
  id:        text('id').primaryKey(),
  docName:   text('docName').notNull(),
  snapshot:  bytea('snapshot').notNull(),
  label:     text('label'),
  userId:    text('userId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('panel_version_doc_idx').on(table.docName, table.createdAt),
])

export const panelGlobal = pgTable('PanelGlobal', {
  slug:      text('slug').primaryKey(),
  data:      text('data').notNull().default('{}'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const aiConversation = pgTable('AiConversation', {
  id:            text('id').primaryKey(),
  userId:        text('userId'),
  title:         text('title').notNull().default('New conversation'),
  resourceSlug:  text('resourceSlug'),
  recordId:      text('recordId'),
  createdAt:     timestamp('createdAt').notNull().defaultNow(),
  updatedAt:     timestamp('updatedAt').notNull().defaultNow(),
}, (table) => [
  index('ai_conv_user_idx').on(table.userId, table.updatedAt),
  index('ai_conv_resource_idx').on(table.resourceSlug, table.recordId, table.updatedAt),
])

export const aiChatMessage = pgTable('AiChatMessage', {
  id:              text('id').primaryKey(),
  conversationId:  text('conversationId').notNull().references(() => aiConversation.id, { onDelete: 'cascade' }),
  role:            text('role').notNull(),
  content:         text('content').notNull(),
  toolCalls:       text('toolCalls'),
  toolCallId:      text('toolCallId'),
  createdAt:       timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('ai_msg_conv_idx').on(table.conversationId, table.createdAt),
])
