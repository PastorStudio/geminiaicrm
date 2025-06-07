import { storage } from '../storage';
import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WhatsAppChat {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: Date;
  isGroup: boolean;
  unreadCount: number;
  messages: Array<{
    content: string;
    timestamp: Date;
    fromMe: boolean;
  }>;
}

interface ConversationAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  interest_level: 'high' | 'medium' | 'low';
  buying_intent: 'ready' | 'considering' | 'browsing' | 'not_interested';
  urgency: 'urgent' | 'moderate' | 'low';
  lead_quality: number; // 1-100
  suggested_status: 'hot' | 'warm' | 'cold' | 'unqualified';
  next_action: string;
  summary: string;
  key_topics: string[];
}

export class WhatsAppLeadConverter {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('🤖 WhatsApp Lead Converter con Gemini AI inicializado');
      } else {
        console.log('⚠️ Google API key no configurada para análisis de conversaciones');
      }
    } catch (error) {
      console.error('Error inicializando Gemini AI:', error);
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Convierte chats de WhatsApp en leads automáticamente
   */
  async convertChatsToLeads(accountId: number): Promise<{
    processed: number;
    created: number;
    updated: number;
    analyzed: number;
  }> {
    console.log(`🔄 Convirtiendo chats de cuenta ${accountId} en leads...`);
    
    try {
      // Obtener chats reales de WhatsApp
      const chats = await this.getRealChatsFromAccount(accountId);
      
      let processed = 0;
      let created = 0;
      let updated = 0;
      let analyzed = 0;

      for (const chat of chats) {
        if (chat.isGroup) continue; // Skip grupos por ahora
        
        processed++;

        // Verificar si ya existe un lead para este contacto
        const existingLeads = await storage.getLeadsByPhone(chat.phone);
        let lead;

        if (existingLeads.length === 0) {
          // Crear nuevo lead basado en el chat
          lead = await storage.createLead({
            name: chat.name,
            phone: chat.phone,
            email: `${chat.phone}@whatsapp.contact`,
            source: 'whatsapp',
            status: 'new',
            priority: this.determinePriority(chat),
            notes: `Último mensaje: ${chat.lastMessage}\nMensajes sin leer: ${chat.unreadCount}`,
            company: chat.name.includes('Inc') || chat.name.includes('Corp') || chat.name.includes('Ltd') ? chat.name : null
          });
          created++;
          console.log(`✅ Nuevo lead creado: ${chat.name} (${chat.phone})`);
        } else {
          lead = existingLeads[0];
          
          // Actualizar información del lead existente
          await storage.updateLead(lead.id, {
            notes: `${lead.notes || ''}\n\nÚltima actividad: ${new Date().toLocaleString()}\nÚltimo mensaje: ${chat.lastMessage}\n`
          });
          updated++;
          console.log(`🔄 Lead actualizado: ${chat.name} (${chat.phone})`);
        }

        // Analizar conversación con IA si hay mensajes
        if (chat.messages && chat.messages.length > 0 && this.model) {
          try {
            const analysis = await this.analyzeConversation(chat);
            
            // Actualizar lead con análisis de IA
            const analysisNotes = this.formatAnalysisNotes(analysis);
            await storage.updateLead(lead.id, {
              status: this.mapStatusFromAnalysis(analysis),
              priority: this.mapPriorityFromAnalysis(analysis),
              notes: `${lead.notes || ''}\n\n${analysisNotes}`
            });

            analyzed++;
            console.log(`🤖 Conversación analizada: ${chat.name} - Calidad: ${analysis.lead_quality}/100`);
          } catch (analysisError) {
            console.error(`Error analizando conversación de ${chat.name}:`, analysisError);
          }
        }
      }

      console.log(`✅ Conversión completada: ${processed} chats procesados, ${created} leads creados, ${updated} actualizados, ${analyzed} analizados`);
      
      return {
        processed,
        created,
        updated,
        analyzed
      };
    } catch (error) {
      console.error('Error convirtiendo chats a leads:', error);
      throw error;
    }
  }

  /**
   * Obtiene chats reales de una cuenta de WhatsApp usando la API existente
   */
  private async getRealChatsFromAccount(accountId: number): Promise<WhatsAppChat[]> {
    try {
      console.log(`🔄 Obteniendo chats reales desde API para cuenta ${accountId}...`);
      
      // Usar la API existente que ya obtiene chats reales
      const response = await fetch(`http://localhost:5000/api/whatsapp-accounts/${accountId}/chats`);
      
      if (!response.ok) {
        console.log(`⚠️ Error en API de chats para cuenta ${accountId}: ${response.status}`);
        return [];
      }
      
      const chats = await response.json();
      
      if (!Array.isArray(chats) || chats.length === 0) {
        console.log(`⚠️ No hay chats disponibles para cuenta ${accountId}`);
        return [];
      }
      
      console.log(`✅ Obtenidos ${chats.length} chats reales de cuenta ${accountId}`);
      
      // Convertir al formato esperado
      const formattedChats: WhatsAppChat[] = chats.map(chat => ({
        id: chat.id,
        name: chat.name || chat.phone || 'Sin nombre',
        phone: chat.phone || chat.id.replace('@c.us', ''),
        lastMessage: chat.lastMessage || '[Sin mensajes]',
        timestamp: new Date(chat.timestamp || Date.now()),
        isGroup: chat.isGroup || false,
        unreadCount: chat.unreadCount || 0,
        messages: chat.messages || []
      }));

      return formattedChats;
      
    } catch (error) {
      console.error(`❌ Error obteniendo chats de cuenta ${accountId}:`, error);
      return [];
    }
  }

  /**
   * Analiza una conversación con IA para determinar la calidad del lead
   */
  private async analyzeConversation(chat: WhatsAppChat): Promise<ConversationAnalysis> {
    if (!this.model) {
      throw new Error('Gemini AI no configurado');
    }

    // Construir el contexto de la conversación
    const conversation = chat.messages.map(msg => 
      `${msg.fromMe ? 'Nosotros' : chat.name}: ${msg.content}`
    ).join('\n');

    const prompt = `
    Analiza esta conversación de WhatsApp para determinar la calidad del lead y las próximas acciones:

    CONTACTO: ${chat.name} (${chat.phone})
    MENSAJES SIN LEER: ${chat.unreadCount}
    
    CONVERSACIÓN:
    ${conversation}

    Analiza y responde en formato JSON exacto con esta estructura:
    {
      "sentiment": "positive|neutral|negative",
      "interest_level": "high|medium|low", 
      "buying_intent": "ready|considering|browsing|not_interested",
      "urgency": "urgent|moderate|low",
      "lead_quality": number (1-100),
      "suggested_status": "hot|warm|cold|unqualified",
      "next_action": "descripción específica de la próxima acción recomendada",
      "summary": "resumen breve de la conversación",
      "key_topics": ["tema1", "tema2", "tema3"]
    }

    Considera:
    - Interés mostrado en productos/servicios
    - Preguntas sobre precios o disponibilidad
    - Urgencia en las respuestas
    - Calidad de las preguntas
    - Mensajes sin leer como indicador de engagement
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extraer JSON de la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      const analysis: ConversationAnalysis = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      console.error('Error analizando conversación:', error);
      // Retornar análisis básico como fallback
      return {
        sentiment: 'neutral',
        interest_level: 'medium',
        buying_intent: 'browsing',
        urgency: 'low',
        lead_quality: 50,
        suggested_status: 'warm',
        next_action: 'Revisar conversación y responder mensajes pendientes',
        summary: 'Análisis básico aplicado debido a error en IA',
        key_topics: ['conversación_general']
      };
    }
  }

  /**
   * Determina la prioridad inicial basada en datos del chat
   */
  private determinePriority(chat: WhatsAppChat): string {
    if (chat.unreadCount > 5) return 'high';
    if (chat.unreadCount > 2) return 'medium';
    return 'low';
  }

  /**
   * Mapea el análisis de IA a estados de lead
   */
  private mapStatusFromAnalysis(analysis: ConversationAnalysis): string {
    switch (analysis.suggested_status) {
      case 'hot': return 'interested';
      case 'warm': return 'contacted';
      case 'cold': return 'new';
      case 'unqualified': return 'not_interested';
      default: return 'new';
    }
  }

  /**
   * Mapea el análisis de IA a prioridades
   */
  private mapPriorityFromAnalysis(analysis: ConversationAnalysis): string {
    if (analysis.lead_quality >= 80) return 'high';
    if (analysis.lead_quality >= 50) return 'medium';
    return 'low';
  }

  /**
   * Formatea las notas del análisis de IA
   */
  private formatAnalysisNotes(analysis: ConversationAnalysis): string {
    return `
[🤖 ANÁLISIS IA - ${new Date().toLocaleString()}]
• Score: ${analysis.lead_quality}/100
• Categoría: ${analysis.suggested_status.toUpperCase()}
• Probabilidad conversión: ${this.getConversionProbability(analysis.lead_quality)}%
• Sentimiento: ${analysis.sentiment}
• Próxima acción: ${analysis.next_action}
• Timeline: ${this.getTimelineFromUrgency(analysis.urgency)}
• Razonamiento: ${analysis.summary}

Temas clave: ${analysis.key_topics.join(', ')}
Intención de compra: ${analysis.buying_intent}
Nivel de interés: ${analysis.interest_level}
`;
  }

  private getConversionProbability(leadQuality: number): number {
    return Math.round(leadQuality * 0.8); // Conversión conservadora
  }

  private getTimelineFromUrgency(urgency: string): string {
    switch (urgency) {
      case 'urgent': return 'Inmediato (1-2 horas)';
      case 'moderate': return '1-2 días';
      case 'low': return '3-7 días';
      default: return '1 semana';
    }
  }
}

export const whatsappLeadConverter = new WhatsAppLeadConverter();