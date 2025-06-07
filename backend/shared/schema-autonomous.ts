import { pgTable, serial, text, integer, timestamp, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core tables for autonomous WhatsApp AI system
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  role: text("role").default("user"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  status: text("status").default("new"),
  source: text("source").default("whatsapp"),
  notes: text("notes"),
  value: decimal("value").default("0"),
  tags: text("tags").array(),
  assignedTo: integer("assignedTo"),
  whatsappAccountId: integer("whatsappAccountId"),
  chatId: text("chatId"),
  contactId: integer("contactId"),
  leadScore: integer("leadScore").default(0),
  lastContactDate: timestamp("lastContactDate"),
  nextFollowUp: timestamp("nextFollowUp"),
  conversionProbability: decimal("conversionProbability").default("0"),
  aiAnalysis: jsonb("aiAnalysis"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  whatsappAccountId: integer("whatsappAccountId"),
  lastSeen: timestamp("lastSeen"),
  profilePicture: text("profilePicture"),
  isBlocked: boolean("isBlocked").default(false),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  chatId: text("chatId").notNull(),
  title: text("title"),
  status: text("status").default("active"),
  lastMessageAt: timestamp("lastMessageAt"),
  messageCount: integer("messageCount").default(0),
  isArchived: boolean("isArchived").default(false),
  leadId: integer("leadId"),
  ticketId: integer("ticketId"),
  sentiment: text("sentiment"),
  intent: text("intent"),
  urgency: text("urgency").default("low"),
  topics: text("topics").array(),
  aiSummary: text("aiSummary"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  conversationId: integer("conversationId").notNull(),
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

export const salesLeads = pgTable("sales_leads", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("new"),
  priority: text("priority").default("medium"),
  value: decimal("value").default("0"),
  probability: decimal("probability").default("0"),
  expectedCloseDate: timestamp("expectedCloseDate"),
  source: text("source").default("whatsapp"),
  stage: text("stage").default("qualification"),
  tags: text("tags").array(),
  assignedTo: integer("assignedTo"),
  lastContactDate: timestamp("lastContactDate"),
  nextFollowUp: timestamp("nextFollowUp"),
  aiAnalysis: jsonb("aiAnalysis"),
  conversionScore: integer("conversionScore").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  contactId: integer("contactId").notNull(),
  whatsappAccountId: integer("whatsappAccountId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("open"),
  priority: text("priority").default("medium"),
  category: text("category"),
  assignedTo: integer("assignedTo"),
  resolvedAt: timestamp("resolvedAt"),
  resolutionSummary: text("resolutionSummary"),
  tags: text("tags").array(),
  aiAnalysis: jsonb("aiAnalysis"),
  satisfactionScore: integer("satisfactionScore"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const salesActivities = pgTable("sales_activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  contactId: integer("contactId"),
  leadId: integer("leadId"),
  ticketId: integer("ticketId"),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  assignedTo: integer("assignedTo"),
  scheduledDate: timestamp("scheduledDate"),
  completedDate: timestamp("completedDate"),
  result: text("result"),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  isAutomated: boolean("isAutomated").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const aiAnalyticsReports = pgTable("ai_analytics_reports", {
  id: serial("id").primaryKey(),
  reportType: text("reportType").notNull(),
  timeframe: text("timeframe").notNull(),
  data: jsonb("data").notNull(),
  insights: jsonb("insights"),
  recommendations: jsonb("recommendations"),
  generatedAt: timestamp("generatedAt").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(whatsappConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });
export const insertSalesLeadSchema = createInsertSchema(salesLeads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalesActivitySchema = createInsertSchema(salesActivities).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = z.infer<typeof insertConversationSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertMessageSchema>;
export type SalesLead = typeof salesLeads.$inferSelect;
export type InsertSalesLead = z.infer<typeof insertSalesLeadSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SalesActivity = typeof salesActivities.$inferSelect;
export type InsertSalesActivity = z.infer<typeof insertSalesActivitySchema>;