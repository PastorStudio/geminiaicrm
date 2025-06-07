import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, doublePrecision, real, date, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  name: text("name").notNull(),
  role: text("role").default("user"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

// WhatsApp Accounts
export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  isConnected: boolean("isConnected").default(false),
  qrCode: text("qrCode"),
  sessionData: jsonb("sessionData"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  lastActiveAt: timestamp("lastActiveAt"),
});

// Contacts
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  company: text("company"),
  position: text("position"),
  location: text("location"),
  tags: text("tags").array(),
  customFields: jsonb("customFields"),
  lastSeen: timestamp("lastSeen"),
  source: text("source").default("whatsapp"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Leads
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  status: text("status").default("new"),
  source: text("source").default("unknown"),
  priority: text("priority").default("medium"),
  value: text("value"),
  notes: text("notes"),
  tags: text("tags").array(),
  assignedTo: integer("assignedTo"),
  lastContactDate: timestamp("lastContactDate"),
  nextFollowUpDate: timestamp("nextFollowUpDate"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Tickets
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("open"),
  priority: text("priority").default("medium"),
  type: text("type").default("inquiry"),
  contactId: integer("contactId"),
  leadId: integer("leadId"),
  assignedTo: integer("assignedTo"),
  tags: text("tags").array(),
  resolutionNotes: text("resolutionNotes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  resolvedAt: timestamp("resolvedAt"),
});

// Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  leadId: integer("leadId"),
  ticketId: integer("ticketId"),
  chatId: text("chatId").notNull(),
  title: text("title"),
  status: text("status").default("active"),
  lastMessageAt: timestamp("lastMessageAt"),
  messageCount: integer("messageCount").default(0),
  isGroup: boolean("isGroup").default(false),
  aiAnalysis: jsonb("aiAnalysis"),
  sentiment: text("sentiment"),
  intent: text("intent"),
  urgency: text("urgency"),
  topics: text("topics").array(),
  leadPotential: integer("leadPotential").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId"),
  contactId: integer("contactId"),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  messageId: text("messageId").notNull().unique(),
  fromNumber: text("fromNumber").notNull(),
  toNumber: text("toNumber").notNull(),
  content: text("content"),
  messageType: text("messageType").default("text"),
  direction: text("direction").notNull(),
  isFromBot: boolean("isFromBot").default(false),
  mediaUrl: text("mediaUrl"),
  metadata: jsonb("metadata"),
  aiAnalysis: jsonb("aiAnalysis"),
  sentiment: text("sentiment"),
  intent: text("intent"),
  entities: jsonb("entities"),
  isProcessed: boolean("isProcessed").default(false),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Sales Pipeline
export const salesPipeline = pgTable("sales_pipeline", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").notNull(),
  stage: text("stage").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  probability: integer("probability").default(0),
  expectedCloseDate: date("expectedCloseDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  contactId: integer("contactId"),
  leadId: integer("leadId"),
  ticketId: integer("ticketId"),
  conversationId: integer("conversationId"),
  userId: integer("userId"),
  title: text("title").notNull(),
  description: text("description"),
  outcome: text("outcome"),
  duration: integer("duration"),
  scheduledAt: timestamp("scheduledAt"),
  completedAt: timestamp("completedAt"),
  metadata: jsonb("metadata"),
  isAutomated: boolean("isAutomated").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Dashboard Stats
export const dashboardStats = pgTable("dashboard_stats", {
  id: serial("id").primaryKey(),
  totalLeads: integer("totalLeads").default(0),
  newLeadsThisMonth: integer("newLeadsThisMonth").default(0),
  activeLeads: integer("activeLeads").default(0),
  convertedLeads: integer("convertedLeads").default(0),
  totalSales: doublePrecision("totalSales").default(0),
  salesThisMonth: doublePrecision("salesThisMonth").default(0),
  pendingActivities: integer("pendingActivities").default(0),
  completedActivities: integer("completedActivities").default(0),
  performanceMetrics: jsonb("performanceMetrics").default('{"responseTime": 0, "conversionRate": 0, "customerSatisfaction": 0}'),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Relations
export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignee: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  activities: many(activities),
  tickets: many(tickets),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  contact: one(contacts, {
    fields: [messages.contactId],
    references: [contacts.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// Validation schemas
export const insertLeadSchema = createInsertSchema(leads);
export const insertContactSchema = createInsertSchema(contacts);
export const insertMessageSchema = createInsertSchema(messages);
export const insertActivitySchema = createInsertSchema(activities);