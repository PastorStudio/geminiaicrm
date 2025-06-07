/**
 * Sistema Autónomo de Procesamiento de Mensajes WhatsApp
 * Convierte automáticamente cada chat en lead cards y tickets
 */

import { db } from '../db';
import { 
  leads, 
  activities, 
  messages,
  contacts
} from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MessageAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: 'sales' | 'support' | 'inquiry' | 'complaint';
  urgency: 'low' | 'medium' | 'high';
  leadPotential: number;
  shouldCreateLead: boolean;
  extractedInfo: {
    name?: string;
    company?: string;
    products?: string[];
    budget?: string;
  };
}

export class AutonomousProcessor {
  private genAI: GoogleGenerativeAI | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.initializeAI();
    this.startProcessing();
  }

  private initializeAI() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey && apiKey !== 'tu_clave_gemini_aqui') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('🤖 Sistema Autónomo activado con IA');
    } else {
      console.log('⚠️ Sistema funcionando en modo básico');
    }
  }

  private startProcessing() {
    // Procesar mensajes cada 10 segundos
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processNewMessages();
      }
    }, 10000);

    console.log('🔄 Procesamiento autónomo iniciado');
  }

  /**
   * Procesa mensajes nuevos automáticamente
   */
  async processNewMessages(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Obtener mensajes sin procesar de las últimas 2 horas
      const unprocessedMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.isProcessed, false),
          sql`${messages.timestamp} > NOW() - INTERVAL '2 hours'`
        ))
        .orderBy(desc(messages.timestamp))
        .limit(20);

      for (const message of unprocessedMessages) {
        await this.processMessage(message);
      }

      if (unprocessedMessages.length > 0) {
        console.log(`✅ ${unprocessedMessages.length} mensajes procesados automáticamente`);
      }

    } catch (error) {
      console.error('❌ Error en procesamiento autónomo:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesa un mensaje individual
   */
  private async processMessage(message: any): Promise<void> {
    try {
      // Buscar lead existente por teléfono
      const existingLead = await this.findExistingLead(message.fromNumber);
      
      // Analizar mensaje con IA
      const analysis = await this.analyzeMessage(message.content, existingLead);

      // Marcar mensaje como procesado
      await db.update(messages)
        .set({
          isProcessed: true,
          aiAnalysis: analysis,
          sentiment: analysis.sentiment
        })
        .where(eq(messages.id, message.id));

      // Crear lead automáticamente si es necesario
      if (analysis.shouldCreateLead && !existingLead) {
        await this.createAutomaticLead(message, analysis);
      } else if (existingLead) {
        await this.updateExistingLead(existingLead, analysis);
      }

      // Registrar actividad
      await this.logActivity(message, analysis);

    } catch (error) {
      console.error(`❌ Error procesando mensaje ${message.id}:`, error);
    }
  }

  /**
   * Analiza mensaje con IA
   */
  private async analyzeMessage(content: string, existingLead?: any): Promise<MessageAnalysis> {
    if (!this.genAI) {
      return this.basicAnalysis(content);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
Analiza este mensaje de WhatsApp como asesor de telecomunicaciones Telca:

MENSAJE: "${content}"
CONTEXTO: ${existingLead ? `Lead existente: ${existingLead.name}` : 'Nuevo contacto'}

Responde en JSON exacto:
{
  "sentiment": "positive|negative|neutral",
  "intent": "sales|support|inquiry|complaint",
  "urgency": "low|medium|high",
  "leadPotential": 75,
  "shouldCreateLead": true,
  "extractedInfo": {
    "name": "nombre si aparece",
    "company": "empresa si aparece",
    "products": ["servicios mencionados"],
    "budget": "presupuesto si aparece"
  }
}

CRITERIOS:
- shouldCreateLead: true si menciona servicios de telecomunicaciones
- leadPotential: 80+ para empresas, 60+ para residencial
- products: identifica internet, telefonía, fibra óptica, instalaciones
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      try {
        const analysis = JSON.parse(analysisText);
        return analysis;
      } catch {
        return this.basicAnalysis(content);
      }

    } catch (error) {
      return this.basicAnalysis(content);
    }
  }

  /**
   * Análisis básico sin IA
   */
  private basicAnalysis(content: string): MessageAnalysis {
    const lowerContent = content.toLowerCase();
    
    const telcaKeywords = ['internet', 'telefono', 'fibra', 'wifi', 'conexion', 'instalacion'];
    const urgentKeywords = ['urgente', 'rapido', 'hoy', 'problema'];
    const businessKeywords = ['empresa', 'oficina', 'negocio'];

    const hasTelcaIntent = telcaKeywords.some(keyword => lowerContent.includes(keyword));
    const isUrgent = urgentKeywords.some(keyword => lowerContent.includes(keyword));
    const isBusiness = businessKeywords.some(keyword => lowerContent.includes(keyword));

    return {
      sentiment: 'neutral',
      intent: hasTelcaIntent ? 'sales' : 'inquiry',
      urgency: isUrgent ? 'high' : 'medium',
      leadPotential: hasTelcaIntent ? (isBusiness ? 80 : 60) : 30,
      shouldCreateLead: hasTelcaIntent,
      extractedInfo: {
        products: telcaKeywords.filter(keyword => lowerContent.includes(keyword))
      }
    };
  }

  /**
   * Busca lead existente
   */
  private async findExistingLead(phoneNumber: string) {
    try {
      const [existingLead] = await db.select()
        .from(leads)
        .where(eq(leads.phone, phoneNumber))
        .orderBy(desc(leads.createdAt))
        .limit(1);

      return existingLead;
    } catch (error) {
      return null;
    }
  }

  /**
   * Crea lead automático
   */
  private async createAutomaticLead(message: any, analysis: MessageAnalysis): Promise<void> {
    try {
      const leadTitle = analysis.extractedInfo.company 
        ? `${analysis.extractedInfo.company} - Telecomunicaciones`
        : `Lead Auto - ${message.fromNumber}`;

      const [newLead] = await db.insert(leads)
        .values({
          name: analysis.extractedInfo.name || `Contacto ${message.fromNumber}`,
          email: '',
          phone: message.fromNumber,
          company: analysis.extractedInfo.company || '',
          source: 'whatsapp_auto',
          status: analysis.urgency === 'high' ? 'hot' : 'new',
          priority: analysis.urgency,
          notes: `Auto-generado por IA. Productos: ${analysis.extractedInfo.products?.join(', ') || 'Consulta general'}`,
          tags: analysis.extractedInfo.products || [],
          assignedTo: 1 // Asignar a usuario 1 por defecto
        })
        .returning();

      console.log(`🎯 Lead creado automáticamente: ${newLead.name} (${newLead.phone})`);

    } catch (error) {
      console.error('❌ Error creando lead automático:', error);
    }
  }

  /**
   * Actualiza lead existente
   */
  private async updateExistingLead(existingLead: any, analysis: MessageAnalysis): Promise<void> {
    try {
      const newNotes = `${existingLead.notes || ''}\n[${new Date().toISOString()}] ${analysis.intent} - ${analysis.sentiment}`;
      const newTags = [...new Set([...(existingLead.tags || []), ...(analysis.extractedInfo.products || [])])];

      await db.update(leads)
        .set({
          status: analysis.urgency === 'high' ? 'hot' : existingLead.status,
          priority: analysis.urgency === 'high' ? 'high' : existingLead.priority,
          notes: newNotes,
          tags: newTags,
          lastContactDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leads.id, existingLead.id));

      console.log(`🔄 Lead actualizado: ${existingLead.name}`);

    } catch (error) {
      console.error('❌ Error actualizando lead:', error);
    }
  }

  /**
   * Registra actividad automática
   */
  private async logActivity(message: any, analysis: MessageAnalysis): Promise<void> {
    try {
      await db.insert(activities)
        .values({
          type: 'whatsapp',
          leadId: null, // Se podría vincular al lead si existe
          title: 'Mensaje procesado automáticamente',
          notes: `IA: ${analysis.intent}, ${analysis.sentiment}, ${analysis.leadPotential}% potential`,
          completed: true,
          createdAt: new Date()
        });

    } catch (error) {
      console.error('❌ Error registrando actividad:', error);
    }
  }

  /**
   * Fuerza procesamiento de un mensaje específico
   */
  async forceProcess(messageData: any): Promise<void> {
    console.log('🔄 Forzando procesamiento...');
    await this.processMessage(messageData);
  }

  /**
   * Obtiene estadísticas del sistema
   */
  async getStats() {
    try {
      const [leadsToday] = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(sql`DATE(${leads.createdAt}) = CURRENT_DATE`);

      const [totalLeads] = await db.select({ count: sql<number>`count(*)` })
        .from(leads);

      const [messagesProcessed] = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.isProcessed, true));

      return {
        isActive: true,
        isProcessing: this.isProcessing,
        hasAI: this.genAI !== null,
        leadsToday: leadsToday.count,
        totalLeads: totalLeads.count,
        messagesProcessed: messagesProcessed.count
      };

    } catch (error) {
      return {
        isActive: true,
        isProcessing: this.isProcessing,
        hasAI: this.genAI !== null,
        leadsToday: 0,
        totalLeads: 0,
        messagesProcessed: 0
      };
    }
  }
}

// Exportar instancia singleton
export const autonomousProcessor = new AutonomousProcessor();