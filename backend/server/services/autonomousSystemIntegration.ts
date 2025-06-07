/**
 * Integración del Sistema Autónomo con el CRM existente
 * Procesa mensajes automáticamente y actualiza leads/tickets en tiempo real
 */

import { db } from '../db';
import { 
  users, 
  whatsappAccounts, 
  leads, 
  activities, 
  messages 
} from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AutonomousAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: 'sales' | 'support' | 'inquiry' | 'complaint';
  urgency: 'low' | 'medium' | 'high';
  leadPotential: number;
  shouldCreateLead: boolean;
  shouldCreateTicket: boolean;
  extractedInfo: {
    name?: string;
    company?: string;
    products?: string[];
    budget?: string;
    timeline?: string;
  };
}

export class AutonomousSystemIntegration {
  private genAI: GoogleGenerativeAI | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.initializeAI();
    this.startAutonomousProcessing();
  }

  private initializeAI() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey && apiKey !== 'tu_clave_gemini_aqui') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('🤖 Sistema Autónomo integrado con Gemini AI');
    } else {
      console.log('⚠️ Sistema funcionando en modo básico sin IA');
    }
  }

  /**
   * Inicia el procesamiento autónomo continuo
   */
  private startAutonomousProcessing() {
    // Procesar mensajes cada 5 segundos
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processUnprocessedMessages();
      }
    }, 5000);

    // Actualizar leads automáticamente cada 30 segundos
    setInterval(async () => {
      await this.updateLeadsAutomatically();
    }, 30000);

    // Generar reportes automáticos cada hora
    setInterval(async () => {
      await this.generateHourlyInsights();
    }, 3600000);

    console.log('🔄 Sistema autónomo iniciado - procesamiento continuo activado');
  }

  /**
   * Procesa mensajes no procesados automáticamente
   */
  async processUnprocessedMessages(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Obtener mensajes sin procesar de las últimas 24 horas
      const unprocessedMessages = await db.select()
        .from(messages)
        .where(and(
          eq(messages.isProcessed, false),
          sql`${messages.timestamp} > NOW() - INTERVAL '24 hours'`
        ))
        .orderBy(desc(messages.timestamp))
        .limit(50);

      for (const message of unprocessedMessages) {
        await this.processMessage(message);
      }

      if (unprocessedMessages.length > 0) {
        console.log(`✅ Procesados ${unprocessedMessages.length} mensajes automáticamente`);
      }

    } catch (error) {
      console.error('❌ Error en procesamiento autónomo:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesa un mensaje individual con IA
   */
  private async processMessage(message: any): Promise<void> {
    try {
      // Obtener información del contacto si existe
      const existingLead = await this.findExistingLead(message.fromNumber);
      
      // Analizar mensaje con IA
      const analysis = await this.analyzeMessageWithAI(message.content, existingLead);

      // Actualizar mensaje como procesado
      await db.update(messages)
        .set({
          isProcessed: true,
          aiAnalysis: analysis,
          sentiment: analysis.sentiment
        })
        .where(eq(messages.id, message.id));

      // Crear o actualizar lead automáticamente
      if (analysis.shouldCreateLead) {
        await this.createOrUpdateLead(message, analysis);
      }

      // Registrar actividad automática
      await this.logActivity(message, analysis);

    } catch (error) {
      console.error(`❌ Error procesando mensaje ${message.id}:`, error);
    }
  }

  /**
   * Analiza mensaje con IA para extraer intención y datos
   */
  private async analyzeMessageWithAI(content: string, existingLead?: any): Promise<AutonomousAnalysis> {
    if (!this.genAI) {
      return this.basicAnalysis(content);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
Analiza este mensaje de WhatsApp como Martín, asesor de telecomunicaciones de Telca:

MENSAJE: "${content}"
CONTEXTO: ${existingLead ? `Lead existente: ${existingLead.title}` : 'Nuevo contacto'}

Como experto en telecomunicaciones, analiza y responde en JSON:
{
  "sentiment": "positive|negative|neutral",
  "intent": "sales|support|inquiry|complaint", 
  "urgency": "low|medium|high",
  "leadPotential": 85,
  "shouldCreateLead": true,
  "shouldCreateTicket": false,
  "extractedInfo": {
    "name": "nombre si se menciona",
    "company": "empresa si se menciona", 
    "products": ["servicios de telecomunicaciones mencionados"],
    "budget": "presupuesto si se menciona",
    "timeline": "tiempo si se menciona"
  }
}

CRITERIOS TELCA:
- shouldCreateLead: true si hay interés en internet, telefonía, cables, instalaciones
- leadPotential: alto para empresas, mediano para residencial
- products: identifica servicios específicos (fibra óptica, centralita, internet empresarial)
- urgency: alto si necesita solución inmediata o tiene problemas de conectividad
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      try {
        const analysis = JSON.parse(analysisText);
        console.log(`🧠 Análisis IA completado - Lead potential: ${analysis.leadPotential}%`);
        return analysis;
      } catch (parseError) {
        return this.basicAnalysis(content);
      }

    } catch (error) {
      return this.basicAnalysis(content);
    }
  }

  /**
   * Análisis básico sin IA
   */
  private basicAnalysis(content: string): AutonomousAnalysis {
    const lowerContent = content.toLowerCase();
    
    const telcaKeywords = ['internet', 'telefono', 'fibra', 'wifi', 'conexion', 'instalacion', 'cable', 'centralita'];
    const urgentKeywords = ['urgente', 'rapido', 'hoy', 'ahora', 'problema', 'sin internet'];
    const businessKeywords = ['empresa', 'oficina', 'negocio', 'comercial'];

    const hasTelcaIntent = telcaKeywords.some(keyword => lowerContent.includes(keyword));
    const isUrgent = urgentKeywords.some(keyword => lowerContent.includes(keyword));
    const isBusiness = businessKeywords.some(keyword => lowerContent.includes(keyword));

    return {
      sentiment: 'neutral',
      intent: hasTelcaIntent ? 'sales' : 'inquiry',
      urgency: isUrgent ? 'high' : 'medium',
      leadPotential: hasTelcaIntent ? (isBusiness ? 80 : 60) : 30,
      shouldCreateLead: hasTelcaIntent,
      shouldCreateTicket: urgentKeywords.some(keyword => lowerContent.includes(keyword)),
      extractedInfo: {
        products: telcaKeywords.filter(keyword => lowerContent.includes(keyword))
      }
    };
  }

  /**
   * Busca lead existente por número de teléfono
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
   * Crea o actualiza lead automáticamente
   */
  private async createOrUpdateLead(message: any, analysis: AutonomousAnalysis): Promise<void> {
    try {
      const existingLead = await this.findExistingLead(message.fromNumber);

      if (existingLead) {
        // Actualizar lead existente
        await db.update(leads)
          .set({
            status: analysis.urgency === 'high' ? 'hot' : 'warm',
            priority: analysis.urgency,
            notes: `${existingLead.notes || ''}\n[Auto] ${new Date().toISOString()}: ${analysis.intent} detectado`,
            tags: [...(existingLead.tags || []), ...analysis.extractedInfo.products || []],
            updatedAt: new Date()
          })
          .where(eq(leads.id, existingLead.id));

        console.log(`🔄 Lead actualizado automáticamente: ${existingLead.name}`);
      } else {
        // Crear nuevo lead
        const leadTitle = analysis.extractedInfo.company 
          ? `${analysis.extractedInfo.company} - Telecomunicaciones`
          : `Lead Telca - ${message.fromNumber}`;

        const [newLead] = await db.insert(leads)
          .values({
            name: analysis.extractedInfo.name || `Contacto ${message.fromNumber}`,
            email: '',
            phone: message.fromNumber,
            company: analysis.extractedInfo.company || '',
            source: 'whatsapp_auto',
            status: analysis.urgency === 'high' ? 'hot' : 'new',
            priority: analysis.urgency,
            notes: `[Auto-generado] ${analysis.intent} detectado. Productos: ${analysis.extractedInfo.products?.join(', ') || 'Por definir'}`,
            tags: analysis.extractedInfo.products || [],
            assigneeId: 1, // Asignar a Martín por defecto
            createdAt: new Date()
          })
          .returning();

        console.log(`🎯 Nuevo lead creado automáticamente: ${newLead.name}`);
      }

    } catch (error) {
      console.error('❌ Error creando/actualizando lead:', error);
    }
  }

  /**
   * Registra actividad automática
   */
  private async logActivity(message: any, analysis: AutonomousAnalysis): Promise<void> {
    try {
      await db.insert(activities)
        .values({
          type: 'whatsapp',
          contactPhone: message.fromNumber,
          title: 'Mensaje procesado automáticamente',
          description: `Análisis IA: ${analysis.intent}, ${analysis.sentiment} sentiment, ${analysis.leadPotential}% potential`,
          notes: `Productos detectados: ${analysis.extractedInfo.products?.join(', ') || 'Ninguno'}`,
          isAutomated: true,
          timestamp: new Date()
        });

    } catch (error) {
      console.error('❌ Error registrando actividad:', error);
    }
  }

  /**
   * Actualiza leads automáticamente basado en actividad
   */
  private async updateLeadsAutomatically(): Promise<void> {
    try {
      // Actualizar leads inactivos
      await db.execute(sql`
        UPDATE ${leads} 
        SET status = 'cold', priority = 'low'
        WHERE last_contact_date < NOW() - INTERVAL '7 days'
        AND status NOT IN ('won', 'lost', 'cold')
      `);

      // Actualizar leads calientes que no han tenido seguimiento
      await db.execute(sql`
        UPDATE ${leads}
        SET status = 'warm'
        WHERE status = 'hot' 
        AND last_contact_date < NOW() - INTERVAL '2 days'
      `);

    } catch (error) {
      console.error('❌ Error actualizando leads automáticamente:', error);
    }
  }

  /**
   * Genera insights automáticos cada hora
   */
  private async generateHourlyInsights(): Promise<void> {
    try {
      const currentHour = new Date().getHours();
      
      // Solo generar reportes en horario laboral (8-18)
      if (currentHour < 8 || currentHour > 18) return;

      const insights = await this.calculateCurrentInsights();
      
      console.log('📊 Insights automáticos generados:', {
        newLeadsToday: insights.newLeadsToday,
        hotLeads: insights.hotLeads,
        responseRate: insights.responseRate
      });

      // Aquí se podrían enviar notificaciones automáticas si es necesario

    } catch (error) {
      console.error('❌ Error generando insights:', error);
    }
  }

  /**
   * Calcula métricas en tiempo real
   */
  private async calculateCurrentInsights() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [leadsToday] = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(sql`DATE(${leads.createdAt}) = CURRENT_DATE`);

      const [hotLeads] = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(eq(leads.status, 'hot'));

      const [totalMessages] = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(sql`DATE(${messages.timestamp}) = CURRENT_DATE`);

      return {
        newLeadsToday: leadsToday.count,
        hotLeads: hotLeads.count,
        totalMessages: totalMessages.count,
        responseRate: totalMessages.count > 0 ? Math.round((leadsToday.count / totalMessages.count) * 100) : 0
      };

    } catch (error) {
      console.error('❌ Error calculando insights:', error);
      return {
        newLeadsToday: 0,
        hotLeads: 0,
        totalMessages: 0,
        responseRate: 0
      };
    }
  }

  /**
   * Fuerza el procesamiento de un mensaje específico
   */
  async forceProcessMessage(messageData: any): Promise<void> {
    console.log('🔄 Forzando procesamiento de mensaje...');
    await this.processMessage(messageData);
  }

  /**
   * Obtiene estadísticas del sistema autónomo
   */
  async getSystemStats() {
    const insights = await this.calculateCurrentInsights();
    
    return {
      isActive: true,
      isProcessing: this.isProcessing,
      hasAI: this.genAI !== null,
      insights
    };
  }
}

// Instancia singleton
export const autonomousSystem = new AutonomousSystemIntegration();