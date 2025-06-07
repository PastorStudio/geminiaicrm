/**
 * Sistema automático de generación de leads basado en conversaciones
 * Analiza conversaciones y las convierte automáticamente en leads/tickets
 */

import { db } from '../db';
import { leads, chatAssignments, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class AutomaticLeadGenerator {
  
  /**
   * Analiza un chat y determina si debe convertirse en lead automáticamente
   */
  static async analyzeAndCreateLead(accountId: number, chatId: string, messages: any[]) {
    try {
      console.log(`🎯 Analizando chat ${chatId} para generación automática de leads`);
      
      if (!messages || messages.length === 0) {
        return null;
      }

      // Obtener información del contacto
      const contactInfo = this.extractContactInfo(messages);
      
      // Analizar el contenido de la conversación
      const analysis = this.analyzeConversationContent(messages);
      
      // Determinar si cumple criterios para ser un lead
      if (this.shouldCreateLead(analysis, messages)) {
        const leadData = await this.createLeadFromConversation(accountId, chatId, contactInfo, analysis, messages);
        
        // Crear categoría automática si es necesario
        if (analysis.category) {
          await this.createChatCategory(accountId, chatId, analysis.category, analysis.priority);
        }
        
        console.log(`✅ Lead generado automáticamente: ${leadData.id}`);
        return leadData;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error en generación automática de leads:', error);
      return null;
    }
  }

  /**
   * Extrae información de contacto de los mensajes
   */
  private static extractContactInfo(messages: any[]) {
    const lastMessage = messages[messages.length - 1];
    const contactName = lastMessage.notifyName || lastMessage.from?.split('@')[0] || 'Cliente';
    const phone = lastMessage.from?.replace('@c.us', '') || '';
    
    return {
      name: contactName,
      phone: phone,
      whatsappId: lastMessage.from
    };
  }

  /**
   * Analiza el contenido de la conversación para extraer insights
   */
  private static analyzeConversationContent(messages: any[]) {
    const conversationText = messages.map(msg => msg.body).join(' ').toLowerCase();
    const messageCount = messages.length;
    const hasMedia = messages.some(msg => msg.type !== 'chat');
    
    // Palabras clave para diferentes categorías
    const keywords = {
      ventas: ['comprar', 'precio', 'costo', 'vender', 'venta', 'presupuesto', 'cotización', 'producto', 'servicio'],
      soporte: ['problema', 'ayuda', 'error', 'falla', 'reparar', 'soporte', 'technical', 'bug'],
      consulta: ['información', 'pregunta', 'consulta', 'dudas', 'como', 'cuando', 'donde'],
      reclamo: ['queja', 'reclamo', 'molesto', 'mal servicio', 'devolver', 'reembolso']
    };

    // Determinar categoría basada en palabras clave
    let category = 'general';
    let priority = 'normal';
    let score = 0;

    for (const [cat, words] of Object.entries(keywords)) {
      const matches = words.filter(word => conversationText.includes(word)).length;
      if (matches > score) {
        score = matches;
        category = cat;
      }
    }

    // Determinar prioridad
    if (conversationText.includes('urgente') || conversationText.includes('emergency')) {
      priority = 'high';
    } else if (messageCount > 10) {
      priority = 'medium';
    }

    // Determinar valor estimado (muy básico)
    let estimatedValue = 0;
    const valueMatches = conversationText.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
    if (valueMatches) {
      estimatedValue = Math.max(...valueMatches.map(v => parseFloat(v.replace(/[$,]/g, ''))));
    }

    return {
      category,
      priority,
      score,
      messageCount,
      hasMedia,
      estimatedValue: estimatedValue || 100, // Valor mínimo por defecto
      sentiment: this.analyzeSentiment(conversationText),
      lastActivity: new Date()
    };
  }

  /**
   * Determina si una conversación debe convertirse en lead
   */
  private static shouldCreateLead(analysis: any, messages: any[]): boolean {
    // Criterios para generar lead automáticamente:
    // 1. Más de 3 mensajes de intercambio
    // 2. Contiene palabras clave relevantes (score > 0)
    // 3. No es solo saludos básicos
    
    if (messages.length < 3) return false;
    if (analysis.score === 0) return false;
    
    const lastMessage = messages[messages.length - 1];
    const basicGreetings = ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes'];
    const isOnlyGreeting = basicGreetings.some(greeting => 
      lastMessage.body?.toLowerCase().includes(greeting) && lastMessage.body.length < 20
    );
    
    return !isOnlyGreeting;
  }

  /**
   * Crea un lead en la base de datos basado en la conversación
   */
  private static async createLeadFromConversation(
    accountId: number, 
    chatId: string, 
    contactInfo: any, 
    analysis: any, 
    messages: any[]
  ) {
    const leadData = {
      name: contactInfo.name,
      email: null,
      phone: contactInfo.phone,
      company: null,
      position: null,
      source: 'whatsapp',
      status: 'new',
      priority: analysis.priority,
      estimatedValue: analysis.estimatedValue,
      notes: `Lead generado automáticamente desde WhatsApp.\nCategoría: ${analysis.category}\nMensajes: ${analysis.messageCount}\nÚltima actividad: ${analysis.lastActivity.toISOString()}`,
      assignedToId: null,
      createdAt: new Date(),
      lastContactedAt: new Date()
    };

    const [newLead] = await db.insert(leads)
      .values(leadData)
      .returning();

    return newLead;
  }

  /**
   * Crea una categoría automática para el chat
   */
  private static async createChatCategory(accountId: number, chatId: string, category: string, priority: string) {
    try {
      // Verificar si ya existe una categoría para este chat
      const existing = await db.select()
        .from(chatCategories)
        .where(and(
          eq(chatCategories.chatId, chatId),
          eq(chatCategories.accountId, accountId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const categoryData = {
        chatId,
        accountId,
        category: this.mapCategoryToTicketType(category),
        priority,
        status: 'open',
        createdAt: new Date(),
        lastAnalyzedAt: new Date()
      };

      const [newCategory] = await db.insert(chatCategories)
        .values(categoryData)
        .returning();

      return newCategory;
      
    } catch (error) {
      console.error('❌ Error creando categoría automática:', error);
      return null;
    }
  }

  /**
   * Mapea categorías de análisis a tipos de ticket
   */
  private static mapCategoryToTicketType(category: string): string {
    const mapping: { [key: string]: string } = {
      'ventas': 'venta',
      'soporte': 'soporte',
      'consulta': 'consulta',
      'reclamo': 'reclamo',
      'general': 'general'
    };
    
    return mapping[category] || 'general';
  }

  /**
   * Análisis básico de sentimiento
   */
  private static analyzeSentiment(text: string): string {
    const positiveWords = ['gracias', 'excelente', 'bueno', 'perfecto', 'genial'];
    const negativeWords = ['malo', 'terrible', 'problema', 'molesto', 'horrible'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Procesa múltiples chats y genera leads automáticamente
   */
  static async processBatchLeadGeneration(accountId: number, chats: any[]) {
    console.log(`🎯 Procesando ${chats.length} chats para generación de leads`);
    
    const results = [];
    
    for (const chat of chats) {
      try {
        if (chat.messages && chat.messages.length > 0) {
          const lead = await this.analyzeAndCreateLead(accountId, chat.id._serialized, chat.messages);
          if (lead) {
            results.push(lead);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando chat ${chat.id._serialized}:`, error);
      }
    }
    
    console.log(`✅ Generados ${results.length} leads automáticamente`);
    return results;
  }
}