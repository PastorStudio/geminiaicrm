import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, doublePrecision, real, date, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Contactos - información centralizada de contactos
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  company: text("company"),
  position: text("position"),
  whatsappProfile: jsonb("whatsappProfile"), // Foto, estado, etc.
  location: text("location"),
  tags: text("tags").array(),
  customFields: jsonb("customFields"),
  lastSeen: timestamp("lastSeen"),
  source: text("source").default("whatsapp"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Leads del Sales Pipeline
export const salesLeads = pgTable("sales_leads", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  title: text("title").notNull(),
  status: text("status").default("new"), // new, contacted, qualified, proposal, negotiation, won, lost
  stage: text("stage").default("lead"), // lead, opportunity, quote, deal
  value: decimal("value", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  probability: integer("probability").default(0), // 0-100
  priority: text("priority").default("medium"), // low, medium, high, urgent
  source: text("source").default("whatsapp"),
  assignedTo: integer("assignedTo"), // Usuario asignado
  expectedCloseDate: date("expectedCloseDate"),
  actualCloseDate: date("actualCloseDate"),
  lastContactDate: timestamp("lastContactDate"),
  nextFollowUpDate: timestamp("nextFollowUpDate"),
  notes: text("notes"),
  tags: text("tags").array(),
  customFields: jsonb("customFields"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Tickets de soporte/interés
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  leadId: integer("leadId"), // Opcional, si está relacionado a un lead
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("inquiry"), // inquiry, support, complaint, follow_up
  status: text("status").default("open"), // open, in_progress, pending, resolved, closed
  priority: text("priority").default("medium"), // low, medium, high, urgent
  category: text("category"),
  assignedTo: integer("assignedTo"),
  resolutionNotes: text("resolutionNotes"),
  estimatedResolutionTime: integer("estimatedResolutionTime"), // en minutos
  actualResolutionTime: integer("actualResolutionTime"),
  tags: text("tags").array(),
  customFields: jsonb("customFields"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  resolvedAt: timestamp("resolvedAt"),
});

// Conversaciones de WhatsApp con análisis automático
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  leadId: integer("leadId"), // Si la conversación genera un lead
  ticketId: integer("ticketId"), // Si la conversación genera un ticket
  chatId: text("chatId").notNull(), // ID único del chat de WhatsApp
  title: text("title"),
  status: text("status").default("active"), // active, archived, closed
  lastMessageAt: timestamp("lastMessageAt"),
  messageCount: integer("messageCount").default(0),
  isGroup: boolean("isGroup").default(false),
  participants: jsonb("participants"), // Para chats grupales
  aiAnalysis: jsonb("aiAnalysis"), // Análisis automático de la IA
  sentiment: text("sentiment"), // positive, negative, neutral
  intent: text("intent"), // sales, support, inquiry, complaint
  urgency: text("urgency"), // low, medium, high
  topics: text("topics").array(),
  leadPotential: integer("leadPotential").default(0), // 0-100
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Mensajes individuales con análisis de IA
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  contactId: integer("contactId"),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  messageId: text("messageId").notNull().unique(), // ID único de WhatsApp
  fromNumber: text("fromNumber").notNull(),
  toNumber: text("toNumber").notNull(),
  content: text("content"),
  messageType: text("messageType").default("text"), // text, image, audio, video, document
  direction: text("direction").notNull(), // inbound, outbound
  isFromBot: boolean("isFromBot").default(false),
  mediaUrl: text("mediaUrl"),
  metadata: jsonb("metadata"),
  aiAnalysis: jsonb("aiAnalysis"), // Análisis de contenido por IA
  sentiment: text("sentiment"),
  intent: text("intent"),
  entities: jsonb("entities"), // Entidades extraídas (nombres, fechas, etc.)
  isProcessed: boolean("isProcessed").default(false),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Pipeline de ventas - etapas personalizables
export const salesPipelines = pgTable("sales_pipelines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  stages: jsonb("stages"), // Array de etapas configurables
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Actividades y seguimientos automáticos
export const salesActivities = pgTable("sales_activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // call, email, whatsapp, meeting, note, task
  contactId: integer("contactId"),
  leadId: integer("leadId"),
  ticketId: integer("ticketId"),
  conversationId: integer("conversationId"),
  userId: integer("userId"), // Usuario que realizó la actividad
  title: text("title").notNull(),
  description: text("description"),
  outcome: text("outcome"), // completed, scheduled, cancelled, no_answer
  duration: integer("duration"), // en minutos
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  metadata: jsonb("metadata"),
  isAutomated: boolean("isAutomated").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Análisis y reportes automáticos
export const aiAnalyticsReports = pgTable("ai_analytics_reports", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // daily, weekly, monthly, custom
  dateRange: jsonb("dateRange"),
  metrics: jsonb("metrics"),
  insights: jsonb("insights"), // Insights generados por IA
  whatsappAccountId: integer("whatsappAccountId"),
  generatedBy: text("generatedBy").default("system"),
  isAutomated: boolean("isAutomated").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Relaciones
export const contactsRelations = relations(contacts, ({ many }) => ({
  leads: many(salesLeads),
  tickets: many(supportTickets),
  conversations: many(whatsappConversations),
  messages: many(whatsappMessages),
  activities: many(salesActivities),
}));

export const salesLeadsRelations = relations(salesLeads, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [salesLeads.contactId],
    references: [contacts.id],
  }),
  tickets: many(supportTickets),
  activities: many(salesActivities),
}));

export const whatsappConversationsRelations = relations(whatsappConversations, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [whatsappConversations.contactId],
    references: [contacts.id],
  }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  conversation: one(whatsappConversations, {
    fields: [whatsappMessages.conversationId],
    references: [whatsappConversations.id],
  }),
  contact: one(contacts, {
    fields: [whatsappMessages.contactId],
    references: [contacts.id],
  }),
}));

// Tipos TypeScript
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type SalesLead = typeof salesLeads.$inferSelect;
export type InsertSalesLead = typeof salesLeads.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = typeof whatsappConversations.$inferInsert;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// Esquemas de validación Zod
export const insertContactSchema = createInsertSchema(contacts);
export const insertSalesLeadSchema = createInsertSchema(salesLeads);
export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations);
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages);