/**
 * Sistema Autónomo en Tiempo Real - Procesamiento Automático de WhatsApp
 * Convierte automáticamente cada chat en leads y tickets sin intervención humana
 */

import { db } from '../db';
import { leads, contacts, whatsappConversations, whatsappMessages, salesLeads, supportTickets, salesActivities } from '../../shared/schema-autonomous';
import { eq, desc, and, sql, gt } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WhatsAppConnection {
  authenticated: boolean;
  status: string;
  lastCheck: Date;
  chatCount: number;
}

interface ChatAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: 'sales' | 'support' | 'inquiry' | 'complaint' | 'lead';
  urgency: 'low' | 'medium' | 'high';
  leadScore: number;
  shouldCreateLead: boolean;
  shouldCreateTicket: boolean;
  extractedInfo: {
    name?: string;
    company?: string;
    products?: string[];
    budget?: string;
    phone?: string;
  };
}

export class RealTimeAutonomousProcessor {
  private genAI: GoogleGenerativeAI | null = null;
  private isProcessing: boolean = false;
  private lastProcessedTime: Date = new Date();
  private processedChats: Set<string> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAI();
    this.startRealTimeMonitoring();
    console.log('🚀 Sistema Autónomo en Tiempo Real iniciado');
  }

  private initializeAI() {
    // Try multiple possible API key locations
    const apiKey = process.env.GOOGLE_AI_API_KEY || 
                   process.env.GEMINI_API_KEY || 
                   process.env.OPENAI_API_KEY;
    
    if (apiKey && apiKey !== 'tu_clave_gemini_aqui') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('🤖 IA activada para análisis automático');
    } else {
      console.log('⚠️ Funcionando en modo análisis básico sin IA');
    }
  }

  private startRealTimeMonitoring() {
    // Monitor every 15 seconds for new WhatsApp data
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAndProcessNewData();
      } catch (error) {
        console.error('❌ Error en monitoreo autónomo:', error);
      }
    }, 15000);

    // Initial processing
    setTimeout(() => this.checkAndProcessNewData(), 5000);
  }

  private async checkAndProcessNewData() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      console.log('🔍 Verificando nuevos datos de WhatsApp...');

      // Check WhatsApp connection status
      const whatsappStatus = await this.getWhatsAppStatus();
      
      if (!whatsappStatus.authenticated) {
        console.log('📵 WhatsApp no conectado, esperando conexión...');
        return;
      }

      // Get all chats from WhatsApp
      const chats = await this.getAllChats();
      
      if (chats.length === 0) {
        console.log('📭 No hay chats disponibles');
        return;
      }

      console.log(`📱 Procesando ${chats.length} chats de WhatsApp...`);

      // Process each chat into leads/tickets
      let newLeads = 0;
      let newTickets = 0;
      
      for (const chat of chats) {
        const processed = await this.processChatAutomatically(chat);
        if (processed.leadCreated) newLeads++;
        if (processed.ticketCreated) newTickets++;
      }

      if (newLeads > 0 || newTickets > 0) {
        console.log(`✅ Procesamiento completado: ${newLeads} leads, ${newTickets} tickets creados`);
        await this.updateDashboardStats();
      }

    } catch (error) {
      console.error('❌ Error en procesamiento autónomo:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getWhatsAppStatus() {
    try {
      const response = await fetch('http://localhost:5000/api/direct/whatsapp/status');
      const data = await response.json();
      return {
        authenticated: data.authenticated || false,
        status: data.status || 'disconnected'
      };
    } catch (error) {
      return { authenticated: false, status: 'error' };
    }
  }

  private async getAllChats() {
    try {
      const response = await fetch('http://localhost:5000/api/direct/whatsapp/chats');
      const chats = await response.json();
      return Array.isArray(chats) ? chats : [];
    } catch (error) {
      console.error('Error obteniendo chats:', error);
      return [];
    }
  }

  private async processChatAutomatically(chat: any) {
    const result = { leadCreated: false, ticketCreated: false };
    
    try {
      // Skip if already processed
      const chatId = chat.id._serialized || chat.id;
      if (this.processedChats.has(chatId)) {
        return result;
      }

      console.log(`🔄 Procesando chat: ${chatId}`);

      // Extract contact information
      const contactInfo = this.extractContactInfo(chat);
      
      // Get or create contact
      const contact = await this.getOrCreateContact(contactInfo);
      
      // Get recent messages for analysis
      const messages = await this.getChatMessages(chatId);
      
      // Analyze chat content
      const analysis = await this.analyzeChatContent(messages, contactInfo);
      
      // Create lead if sales potential detected
      if (analysis.shouldCreateLead) {
        await this.createLeadFromChat(contact.id, chat, analysis);
        result.leadCreated = true;
        console.log(`💼 Lead creado para: ${contactInfo.name}`);
      }
      
      // Create support ticket if needed
      if (analysis.shouldCreateTicket) {
        await this.createSupportTicket(contact.id, chat, analysis);
        result.ticketCreated = true;
        console.log(`🎫 Ticket creado para: ${contactInfo.name}`);
      }

      // Create conversation record
      await this.createConversationRecord(contact.id, chat, analysis);
      
      // Mark as processed
      this.processedChats.add(chatId);
      
    } catch (error) {
      console.error('Error procesando chat:', error);
    }
    
    return result;
  }

  private extractContactInfo(chat: any) {
    const contact = chat.contact || {};
    const phoneNumber = chat.id._serialized?.split('@')[0] || 
                       chat.id.user || 
                       chat.number || 
                       'unknown';
    
    return {
      name: contact.pushname || 
            contact.name || 
            contact.shortName || 
            contact.formattedName || 
            `Contact ${phoneNumber}`,
      phone: phoneNumber,
      whatsappId: chat.id._serialized || chat.id,
      isGroup: chat.isGroup || false,
      profilePicUrl: contact.profilePicUrl || null
    };
  }

  private async getOrCreateContact(contactInfo: any) {
    try {
      // Check if contact exists
      const [existingContact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.phone, contactInfo.phone))
        .limit(1);

      if (existingContact) {
        // Update contact info
        await db
          .update(contacts)
          .set({
            name: contactInfo.name,
            lastSeen: new Date(),
            updatedAt: new Date()
          })
          .where(eq(contacts.id, existingContact.id));
        
        return existingContact;
      }

      // Create new contact
      const [newContact] = await db
        .insert(contacts)
        .values({
          name: contactInfo.name,
          phone: contactInfo.phone,
          whatsappAccountId: 1,
          lastSeen: new Date(),
          profilePicture: contactInfo.profilePicUrl,
          metadata: { whatsappId: contactInfo.whatsappId }
        })
        .returning();

      return newContact;
    } catch (error) {
      console.error('Error con contacto:', error);
      throw error;
    }
  }

  private async getChatMessages(chatId: string) {
    try {
      const response = await fetch(`http://localhost:5000/api/whatsapp/messages/${chatId}`);
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      return [];
    }
  }

  private async analyzeChatContent(messages: any[], contactInfo: any): Promise<ChatAnalysis> {
    // Basic analysis without AI
    const basicAnalysis = this.performBasicAnalysis(messages, contactInfo);
    
    // If AI is available, enhance analysis
    if (this.genAI && messages.length > 0) {
      try {
        return await this.performAIAnalysis(messages, basicAnalysis);
      } catch (error) {
        console.log('IA no disponible, usando análisis básico');
      }
    }
    
    return basicAnalysis;
  }

  private performBasicAnalysis(messages: any[], contactInfo: any): ChatAnalysis {
    const messageTexts = messages.map(m => m.body || '').join(' ').toLowerCase();
    
    // Sales keywords
    const salesKeywords = ['precio', 'costo', 'comprar', 'producto', 'servicio', 'cotización', 'presupuesto'];
    const supportKeywords = ['problema', 'ayuda', 'error', 'falla', 'soporte', 'reclamo'];
    const urgentKeywords = ['urgente', 'inmediato', 'ya', 'rápido', 'ahora'];
    
    const salesScore = salesKeywords.filter(keyword => messageTexts.includes(keyword)).length;
    const supportScore = supportKeywords.filter(keyword => messageTexts.includes(keyword)).length;
    const urgencyScore = urgentKeywords.filter(keyword => messageTexts.includes(keyword)).length;
    
    return {
      sentiment: salesScore > supportScore ? 'positive' : supportScore > 0 ? 'negative' : 'neutral',
      intent: salesScore > supportScore ? 'sales' : supportScore > 0 ? 'support' : 'inquiry',
      urgency: urgencyScore > 0 ? 'high' : salesScore > 0 ? 'medium' : 'low',
      leadScore: Math.min(salesScore * 20, 100),
      shouldCreateLead: salesScore > 0 || messages.length > 3,
      shouldCreateTicket: supportScore > 0,
      extractedInfo: {
        name: contactInfo.name,
        phone: contactInfo.phone,
        products: this.extractProducts(messageTexts),
        budget: this.extractBudget(messageTexts)
      }
    };
  }

  private async performAIAnalysis(messages: any[], basicAnalysis: ChatAnalysis): Promise<ChatAnalysis> {
    try {
      const model = this.genAI!.getGenerativeModel({ model: "gemini-pro" });
      
      const messageTexts = messages.slice(-10).map(m => m.body || '').join('\n');
      
      const prompt = `
Analiza esta conversación de WhatsApp y proporciona un análisis en JSON:

Conversación:
${messageTexts}

Responde SOLO con JSON válido con esta estructura:
{
  "sentiment": "positive|negative|neutral",
  "intent": "sales|support|inquiry|complaint|lead",
  "urgency": "low|medium|high",
  "leadScore": 0-100,
  "shouldCreateLead": true/false,
  "shouldCreateTicket": true/false,
  "extractedInfo": {
    "name": "nombre extraído",
    "company": "empresa mencionada",
    "products": ["productos de interés"],
    "budget": "presupuesto mencionado"
  }
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const aiAnalysis = JSON.parse(text);
        
        return {
          ...basicAnalysis,
          ...aiAnalysis,
          extractedInfo: {
            ...basicAnalysis.extractedInfo,
            ...aiAnalysis.extractedInfo
          }
        };
      } catch (parseError) {
        console.log('Error parsing AI response, using basic analysis');
        return basicAnalysis;
      }
    } catch (error) {
      console.log('AI analysis failed, using basic analysis');
      return basicAnalysis;
    }
  }

  private extractProducts(text: string): string[] {
    const productKeywords = ['producto', 'servicio', 'plan', 'paquete', 'software', 'app', 'aplicación'];
    return productKeywords.filter(keyword => text.includes(keyword));
  }

  private extractBudget(text: string): string | undefined {
    const budgetMatch = text.match(/(\$|€|£|₹|\d+)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    return budgetMatch ? budgetMatch[0] : undefined;
  }

  private async createLeadFromChat(contactId: number, chat: any, analysis: ChatAnalysis) {
    try {
      const [newLead] = await db
        .insert(salesLeads)
        .values({
          contactId,
          whatsappAccountId: 1,
          title: `WhatsApp Lead: ${analysis.extractedInfo.name}`,
          description: `Lead automático generado desde WhatsApp. Interés: ${analysis.intent}`,
          status: 'new',
          priority: analysis.urgency,
          probability: analysis.leadScore.toString(),
          source: 'whatsapp',
          stage: 'qualification',
          conversionScore: analysis.leadScore,
          tags: [analysis.intent, analysis.urgency, 'whatsapp-auto'],
          aiAnalysis: {
            sentiment: analysis.sentiment,
            intent: analysis.intent,
            extractedInfo: analysis.extractedInfo,
            processedAt: new Date().toISOString()
          }
        })
        .returning();

      // Create follow-up activity
      await db
        .insert(salesActivities)
        .values({
          type: 'follow-up',
          title: `Seguimiento automático: ${analysis.extractedInfo.name}`,
          description: `Contactar cliente potencial identificado automáticamente`,
          leadId: newLead.id,
          status: 'pending',
          priority: analysis.urgency,
          isAutomated: true,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        });

      return newLead;
    } catch (error) {
      console.error('Error creando lead:', error);
      throw error;
    }
  }

  private async createSupportTicket(contactId: number, chat: any, analysis: ChatAnalysis) {
    try {
      const [newTicket] = await db
        .insert(supportTickets)
        .values({
          contactId,
          whatsappAccountId: 1,
          title: `Soporte WhatsApp: ${analysis.extractedInfo.name}`,
          description: `Ticket automático generado desde WhatsApp`,
          status: 'open',
          priority: analysis.urgency,
          category: analysis.intent,
          tags: [analysis.intent, analysis.urgency, 'whatsapp-auto'],
          aiAnalysis: {
            sentiment: analysis.sentiment,
            intent: analysis.intent,
            extractedInfo: analysis.extractedInfo,
            processedAt: new Date().toISOString()
          }
        })
        .returning();

      return newTicket;
    } catch (error) {
      console.error('Error creando ticket:', error);
      throw error;
    }
  }

  private async createConversationRecord(contactId: number, chat: any, analysis: ChatAnalysis) {
    try {
      const chatId = chat.id._serialized || chat.id;
      
      await db
        .insert(whatsappConversations)
        .values({
          contactId,
          whatsappAccountId: 1,
          chatId,
          title: `Chat: ${analysis.extractedInfo.name}`,
          status: 'active',
          lastMessageAt: new Date(),
          messageCount: chat.unreadCount || 1,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          urgency: analysis.urgency,
          topics: [analysis.intent],
          aiSummary: `Conversación procesada automáticamente. Intent: ${analysis.intent}, Sentiment: ${analysis.sentiment}`
        })
        .onConflictDoUpdate({
          target: [whatsappConversations.chatId],
          set: {
            lastMessageAt: new Date(),
            sentiment: analysis.sentiment,
            intent: analysis.intent,
            urgency: analysis.urgency,
            updatedAt: new Date()
          }
        });

    } catch (error) {
      console.error('Error creando registro de conversación:', error);
    }
  }

  private async updateDashboardStats() {
    try {
      // Trigger dashboard stats update
      await fetch('http://localhost:5000/api/dashboard-stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpdate: true })
      });
      
      console.log('📊 Dashboard actualizado automáticamente');
    } catch (error) {
      console.error('Error actualizando dashboard:', error);
    }
  }

  public async forceProcessAllChats() {
    console.log('🔄 Forzando procesamiento de todos los chats...');
    this.processedChats.clear();
    await this.checkAndProcessNewData();
  }

  public getStats() {
    return {
      isProcessing: this.isProcessing,
      processedChats: this.processedChats.size,
      lastProcessed: this.lastProcessedTime,
      aiEnabled: this.genAI !== null
    };
  }

  public stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🛑 Sistema autónomo detenido');
  }
}

export const realTimeAutonomousProcessor = new RealTimeAutonomousProcessor();