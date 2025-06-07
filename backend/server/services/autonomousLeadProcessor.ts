/**
 * Servicio Autónomo de Procesamiento de Leads y Conversaciones
 * Sistema de análisis automático con IA para generar leads y tickets
 */

import { db } from '../db';
import { 
  contacts, 
  salesLeads, 
  supportTickets, 
  whatsappConversations, 
  whatsappMessages,
  salesActivities
} from '../../shared/autonomous-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MessageAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: 'sales' | 'support' | 'inquiry' | 'complaint' | 'follow_up';
  urgency: 'low' | 'medium' | 'high';
  entities: {
    names: string[];
    companies: string[];
    products: string[];
    dates: string[];
    amounts: string[];
  };
  leadPotential: number; // 0-100
  topics: string[];
  shouldCreateLead: boolean;
  shouldCreateTicket: boolean;
  recommendedActions: string[];
}

export class AutonomousLeadProcessor {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey && apiKey !== 'tu_clave_gemini_aqui') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('🤖 Procesador Autónomo de Leads inicializado con Gemini AI');
    } else {
      console.log('⚠️ API key de Gemini no configurada - funcionando en modo básico');
    }
  }

  /**
   * Procesa un mensaje entrante de WhatsApp de forma autónoma
   */
  async processIncomingMessage(messageData: {
    messageId: string;
    fromNumber: string;
    toNumber: string;
    content: string;
    messageType: string;
    whatsappAccountId: number;
    timestamp: Date;
    mediaUrl?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      console.log(`📥 Procesando mensaje autónomo de ${messageData.fromNumber}`);

      // 1. Obtener o crear contacto
      const contact = await this.getOrCreateContact(messageData.fromNumber, messageData.whatsappAccountId);

      // 2. Obtener o crear conversación
      const conversation = await this.getOrCreateConversation(contact.id, messageData.whatsappAccountId, messageData.fromNumber);

      // 3. Guardar mensaje
      const savedMessage = await this.saveMessage({
        ...messageData,
        conversationId: conversation.id,
        contactId: contact.id,
        direction: 'inbound'
      });

      // 4. Analizar mensaje con IA
      const analysis = await this.analyzeMessage(messageData.content, contact, conversation);

      // 5. Actualizar mensaje con análisis
      await db.update(whatsappMessages)
        .set({
          aiAnalysis: analysis,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          entities: analysis.entities,
          isProcessed: true
        })
        .where(eq(whatsappMessages.id, savedMessage.id));

      // 6. Actualizar conversación con análisis
      await this.updateConversationAnalysis(conversation.id, analysis);

      // 7. Crear lead automáticamente si es necesario
      if (analysis.shouldCreateLead) {
        await this.createAutomaticLead(contact, conversation, analysis);
      }

      // 8. Crear ticket automáticamente si es necesario
      if (analysis.shouldCreateTicket) {
        await this.createAutomaticTicket(contact, conversation, analysis);
      }

      // 9. Registrar actividad automática
      await this.logAutomaticActivity(contact.id, conversation.id, analysis);

      // 10. Actualizar información del contacto en tiempo real
      await this.updateContactRealTime(contact.id, analysis);

      console.log(`✅ Mensaje procesado autónomamente para ${contact.name}`);

    } catch (error) {
      console.error('❌ Error procesando mensaje autónomo:', error);
    }
  }

  /**
   * Obtiene o crea un contacto basado en el número de teléfono
   */
  private async getOrCreateContact(phoneNumber: string, whatsappAccountId: number) {
    // Buscar contacto existente
    const [existingContact] = await db.select()
      .from(contacts)
      .where(eq(contacts.phone, phoneNumber))
      .limit(1);

    if (existingContact) {
      // Actualizar última vista
      await db.update(contacts)
        .set({ 
          lastSeen: new Date(),
          updatedAt: new Date()
        })
        .where(eq(contacts.id, existingContact.id));
      
      return existingContact;
    }

    // Crear nuevo contacto
    const [newContact] = await db.insert(contacts)
      .values({
        name: `Contacto ${phoneNumber}`, // Se actualizará con información real
        phone: phoneNumber,
        source: 'whatsapp',
        lastSeen: new Date(),
        isActive: true
      })
      .returning();

    console.log(`👤 Nuevo contacto creado: ${newContact.name} (${phoneNumber})`);
    return newContact;
  }

  /**
   * Obtiene o crea una conversación
   */
  private async getOrCreateConversation(contactId: number, whatsappAccountId: number, chatId: string) {
    // Buscar conversación existente
    const [existingConversation] = await db.select()
      .from(whatsappConversations)
      .where(and(
        eq(whatsappConversations.contactId, contactId),
        eq(whatsappConversations.whatsappAccountId, whatsappAccountId),
        eq(whatsappConversations.status, 'active')
      ))
      .limit(1);

    if (existingConversation) {
      // Actualizar última actividad
      await db.update(whatsappConversations)
        .set({ 
          lastMessageAt: new Date(),
          messageCount: sql`${whatsappConversations.messageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(whatsappConversations.id, existingConversation.id));
      
      return existingConversation;
    }

    // Crear nueva conversación
    const [newConversation] = await db.insert(whatsappConversations)
      .values({
        contactId,
        whatsappAccountId,
        chatId,
        title: `Chat con ${chatId}`,
        status: 'active',
        lastMessageAt: new Date(),
        messageCount: 1,
        isGroup: false
      })
      .returning();

    console.log(`💬 Nueva conversación creada para contacto ${contactId}`);
    return newConversation;
  }

  /**
   * Guarda un mensaje en la base de datos
   */
  private async saveMessage(messageData: any) {
    const [savedMessage] = await db.insert(whatsappMessages)
      .values({
        conversationId: messageData.conversationId,
        contactId: messageData.contactId,
        whatsappAccountId: messageData.whatsappAccountId,
        messageId: messageData.messageId,
        fromNumber: messageData.fromNumber,
        toNumber: messageData.toNumber,
        content: messageData.content,
        messageType: messageData.messageType,
        direction: messageData.direction,
        isFromBot: false,
        mediaUrl: messageData.mediaUrl,
        metadata: messageData.metadata,
        timestamp: messageData.timestamp,
        isProcessed: false
      })
      .returning();

    return savedMessage;
  }

  /**
   * Analiza un mensaje usando IA para determinar intención y generar leads/tickets
   */
  private async analyzeMessage(content: string, contact: any, conversation: any): Promise<MessageAnalysis> {
    if (!this.genAI) {
      return this.basicAnalysis(content);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
Analiza el siguiente mensaje de WhatsApp y proporciona un análisis detallado en formato JSON:

MENSAJE: "${content}"
CONTACTO: ${contact.name} (${contact.phone})
EMPRESA: ${contact.company || 'No especificada'}

Proporciona el análisis en este formato JSON exacto:
{
  "sentiment": "positive|negative|neutral",
  "intent": "sales|support|inquiry|complaint|follow_up",
  "urgency": "low|medium|high",
  "entities": {
    "names": ["nombres mencionados"],
    "companies": ["empresas mencionadas"],
    "products": ["productos o servicios mencionados"],
    "dates": ["fechas mencionadas"],
    "amounts": ["cantidades o precios mencionados"]
  },
  "leadPotential": 85,
  "topics": ["lista de temas principales"],
  "shouldCreateLead": true,
  "shouldCreateTicket": false,
  "recommendedActions": ["acciones recomendadas"]
}

CRITERIOS:
- shouldCreateLead: true si hay interés en productos/servicios, menciona presupuesto, o muestra intención de compra
- shouldCreateTicket: true si hay problemas técnicos, quejas, o necesita soporte
- leadPotential: 0-100 basado en la probabilidad de conversión
- sentiment: analiza el tono emocional del mensaje
- urgency: basado en palabras clave como "urgente", "rápido", "hoy", etc.
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      // Intentar parsear como JSON
      try {
        const analysis = JSON.parse(analysisText);
        console.log(`🧠 Análisis IA completado - Lead potential: ${analysis.leadPotential}%`);
        return analysis;
      } catch (parseError) {
        console.log('⚠️ Error parseando respuesta de IA, usando análisis básico');
        return this.basicAnalysis(content);
      }

    } catch (error) {
      console.log('⚠️ Error en análisis de IA, usando análisis básico:', error);
      return this.basicAnalysis(content);
    }
  }

  /**
   * Análisis básico sin IA para casos de fallback
   */
  private basicAnalysis(content: string): MessageAnalysis {
    const lowerContent = content.toLowerCase();
    
    // Palabras clave para diferentes intenciones
    const salesKeywords = ['precio', 'costo', 'comprar', 'producto', 'servicio', 'cotización', 'presupuesto'];
    const supportKeywords = ['problema', 'error', 'ayuda', 'soporte', 'falla', 'no funciona'];
    const urgentKeywords = ['urgente', 'rápido', 'hoy', 'ahora', 'inmediato'];
    const negativeKeywords = ['mal', 'problema', 'error', 'molesto', 'insatisfecho'];
    const positiveKeywords = ['bien', 'excelente', 'perfecto', 'gracias', 'genial'];

    const hasSalesIntent = salesKeywords.some(keyword => lowerContent.includes(keyword));
    const hasSupportIntent = supportKeywords.some(keyword => lowerContent.includes(keyword));
    const isUrgent = urgentKeywords.some(keyword => lowerContent.includes(keyword));
    const isNegative = negativeKeywords.some(keyword => lowerContent.includes(keyword));
    const isPositive = positiveKeywords.some(keyword => lowerContent.includes(keyword));

    return {
      sentiment: isNegative ? 'negative' : isPositive ? 'positive' : 'neutral',
      intent: hasSalesIntent ? 'sales' : hasSupportIntent ? 'support' : 'inquiry',
      urgency: isUrgent ? 'high' : 'medium',
      entities: {
        names: [],
        companies: [],
        products: [],
        dates: [],
        amounts: []
      },
      leadPotential: hasSalesIntent ? 70 : 30,
      topics: [hasSalesIntent ? 'ventas' : hasSupportIntent ? 'soporte' : 'consulta'],
      shouldCreateLead: hasSalesIntent,
      shouldCreateTicket: hasSupportIntent,
      recommendedActions: ['Seguimiento manual recomendado']
    };
  }

  /**
   * Actualiza el análisis de la conversación
   */
  private async updateConversationAnalysis(conversationId: number, analysis: MessageAnalysis) {
    await db.update(whatsappConversations)
      .set({
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        urgency: analysis.urgency,
        topics: analysis.topics,
        leadPotential: analysis.leadPotential,
        aiAnalysis: analysis,
        updatedAt: new Date()
      })
      .where(eq(whatsappConversations.id, conversationId));
  }

  /**
   * Crea automáticamente un lead basado en el análisis
   */
  private async createAutomaticLead(contact: any, conversation: any, analysis: MessageAnalysis) {
    try {
      const [newLead] = await db.insert(salesLeads)
        .values({
          contactId: contact.id,
          whatsappAccountId: conversation.whatsappAccountId,
          title: `Lead automático - ${contact.name}`,
          status: 'new',
          stage: 'lead',
          probability: analysis.leadPotential,
          priority: analysis.urgency === 'high' ? 'urgent' : analysis.urgency,
          source: 'whatsapp',
          lastContactDate: new Date(),
          notes: `Lead generado automáticamente por IA. Temas: ${analysis.topics.join(', ')}`,
          tags: analysis.topics,
          customFields: {
            aiAnalysis: analysis,
            generatedAutomatically: true
          }
        })
        .returning();

      // Vincular conversación al lead
      await db.update(whatsappConversations)
        .set({ leadId: newLead.id })
        .where(eq(whatsappConversations.id, conversation.id));

      console.log(`🎯 Lead automático creado: ${newLead.title} (ID: ${newLead.id})`);
      return newLead;

    } catch (error) {
      console.error('❌ Error creando lead automático:', error);
    }
  }

  /**
   * Crea automáticamente un ticket basado en el análisis
   */
  private async createAutomaticTicket(contact: any, conversation: any, analysis: MessageAnalysis) {
    try {
      const [newTicket] = await db.insert(supportTickets)
        .values({
          contactId: contact.id,
          whatsappAccountId: conversation.whatsappAccountId,
          title: `Ticket automático - ${contact.name}`,
          description: `Ticket generado automáticamente. Temas: ${analysis.topics.join(', ')}`,
          type: analysis.intent === 'complaint' ? 'complaint' : 'inquiry',
          status: 'open',
          priority: analysis.urgency,
          category: analysis.intent,
          tags: analysis.topics,
          customFields: {
            aiAnalysis: analysis,
            generatedAutomatically: true
          }
        })
        .returning();

      // Vincular conversación al ticket
      await db.update(whatsappConversations)
        .set({ ticketId: newTicket.id })
        .where(eq(whatsappConversations.id, conversation.id));

      console.log(`🎫 Ticket automático creado: ${newTicket.title} (ID: ${newTicket.id})`);
      return newTicket;

    } catch (error) {
      console.error('❌ Error creando ticket automático:', error);
    }
  }

  /**
   * Registra actividad automática
   */
  private async logAutomaticActivity(contactId: number, conversationId: number, analysis: MessageAnalysis) {
    try {
      await db.insert(salesActivities)
        .values({
          type: 'whatsapp',
          contactId,
          conversationId,
          title: 'Mensaje procesado automáticamente',
          description: `Análisis IA: ${analysis.sentiment} sentiment, ${analysis.intent} intent, ${analysis.leadPotential}% lead potential`,
          outcome: 'completed',
          metadata: {
            analysis,
            processedAt: new Date()
          },
          isAutomated: true,
          completedAt: new Date()
        });

    } catch (error) {
      console.error('❌ Error registrando actividad automática:', error);
    }
  }

  /**
   * Actualiza información del contacto en tiempo real
   */
  private async updateContactRealTime(contactId: number, analysis: MessageAnalysis) {
    try {
      const updates: any = {
        lastSeen: new Date(),
        updatedAt: new Date()
      };

      // Actualizar tags si se detectaron nuevos temas
      if (analysis.topics.length > 0) {
        const [currentContact] = await db.select()
          .from(contacts)
          .where(eq(contacts.id, contactId))
          .limit(1);

        if (currentContact) {
          const currentTags = currentContact.tags || [];
          const newTags = [...new Set([...currentTags, ...analysis.topics])];
          updates.tags = newTags;
        }
      }

      // Actualizar empresa si se detectó
      if (analysis.entities.companies.length > 0) {
        const [currentContact] = await db.select()
          .from(contacts)
          .where(eq(contacts.id, contactId))
          .limit(1);

        if (currentContact && !currentContact.company) {
          updates.company = analysis.entities.companies[0];
        }
      }

      await db.update(contacts)
        .set(updates)
        .where(eq(contacts.id, contactId));

    } catch (error) {
      console.error('❌ Error actualizando contacto en tiempo real:', error);
    }
  }

  /**
   * Genera reportes automáticos diarios
   */
  async generateDailyReport(whatsappAccountId?: number): Promise<void> {
    try {
      console.log('📊 Generando reporte diario automático...');

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Métricas del día
      const metrics = {
        totalMessages: await this.countTodayMessages(whatsappAccountId),
        totalContacts: await this.countTodayContacts(whatsappAccountId),
        leadsGenerated: await this.countTodayLeads(whatsappAccountId),
        ticketsCreated: await this.countTodayTickets(whatsappAccountId),
        avgLeadPotential: await this.getAvgLeadPotential(whatsappAccountId),
        sentimentDistribution: await this.getSentimentDistribution(whatsappAccountId)
      };

      // Generar insights con IA si está disponible
      const insights = await this.generateInsights(metrics);

      // Guardar reporte
      await db.insert(aiAnalyticsReports)
        .values({
          type: 'daily',
          dateRange: { start: yesterday, end: today },
          metrics,
          insights,
          whatsappAccountId,
          generatedBy: 'system',
          isAutomated: true
        });

      console.log('✅ Reporte diario generado automáticamente');

    } catch (error) {
      console.error('❌ Error generando reporte diario:', error);
    }
  }

  private async countTodayMessages(whatsappAccountId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = db.select({ count: sql`count(*)` })
      .from(whatsappMessages)
      .where(sql`${whatsappMessages.createdAt} >= ${today}`);

    if (whatsappAccountId) {
      query.where(eq(whatsappMessages.whatsappAccountId, whatsappAccountId));
    }

    const [result] = await query;
    return Number(result.count);
  }

  private async countTodayContacts(whatsappAccountId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db.select({ count: sql`count(*)` })
      .from(contacts)
      .where(sql`${contacts.createdAt} >= ${today}`);

    return Number(result.count);
  }

  private async countTodayLeads(whatsappAccountId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = db.select({ count: sql`count(*)` })
      .from(salesLeads)
      .where(sql`${salesLeads.createdAt} >= ${today}`);

    if (whatsappAccountId) {
      query.where(eq(salesLeads.whatsappAccountId, whatsappAccountId));
    }

    const [result] = await query;
    return Number(result.count);
  }

  private async countTodayTickets(whatsappAccountId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = db.select({ count: sql`count(*)` })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} >= ${today}`);

    if (whatsappAccountId) {
      query.where(eq(supportTickets.whatsappAccountId, whatsappAccountId));
    }

    const [result] = await query;
    return Number(result.count);
  }

  private async getAvgLeadPotential(whatsappAccountId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = db.select({ avg: sql`avg(${salesLeads.probability})` })
      .from(salesLeads)
      .where(sql`${salesLeads.createdAt} >= ${today}`);

    if (whatsappAccountId) {
      query.where(eq(salesLeads.whatsappAccountId, whatsappAccountId));
    }

    const [result] = await query;
    return Number(result.avg) || 0;
  }

  private async getSentimentDistribution(whatsappAccountId?: number): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = db.select({ 
      sentiment: whatsappMessages.sentiment,
      count: sql`count(*)` 
    })
      .from(whatsappMessages)
      .where(sql`${whatsappMessages.createdAt} >= ${today}`)
      .groupBy(whatsappMessages.sentiment);

    if (whatsappAccountId) {
      query.where(eq(whatsappMessages.whatsappAccountId, whatsappAccountId));
    }

    const results = await query;
    return results.reduce((acc, curr) => {
      acc[curr.sentiment || 'unknown'] = Number(curr.count);
      return acc;
    }, {});
  }

  private async generateInsights(metrics: any): Promise<any> {
    if (!this.genAI) {
      return {
        summary: 'Análisis básico sin IA',
        recommendations: ['Revisar métricas manualmente']
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
Analiza las siguientes métricas diarias y genera insights y recomendaciones:

MÉTRICAS:
- Mensajes totales: ${metrics.totalMessages}
- Contactos nuevos: ${metrics.totalContacts}
- Leads generados: ${metrics.leadsGenerated}
- Tickets creados: ${metrics.ticketsCreated}
- Potencial promedio de leads: ${metrics.avgLeadPotential}%
- Distribución de sentimientos: ${JSON.stringify(metrics.sentimentDistribution)}

Genera un análisis en formato JSON:
{
  "summary": "Resumen ejecutivo del día",
  "trends": ["tendencias identificadas"],
  "recommendations": ["recomendaciones específicas"],
  "alerts": ["alertas o áreas de preocupación"]
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const insightsText = response.text();

      return JSON.parse(insightsText);

    } catch (error) {
      console.log('⚠️ Error generando insights con IA:', error);
      return {
        summary: 'Error generando insights automáticos',
        recommendations: ['Revisar métricas manualmente']
      };
    }
  }
}

// Exportar instancia singleton
export const autonomousProcessor = new AutonomousLeadProcessor();