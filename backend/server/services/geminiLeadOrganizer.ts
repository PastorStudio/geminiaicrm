import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../storage';
import type { Lead, Activity, Message } from '@shared/schema';

interface LeadAnalysis {
  priority: 'high' | 'medium' | 'low';
  score: number;
  category: string;
  nextAction: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  conversionProbability: number;
  reasoning: string;
  suggestedFollowUp: string;
  timeline: string;
}

interface TicketClassification {
  urgency: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  department: string;
  estimatedResolutionTime: string;
  requiredSkills: string[];
  escalationNeeded: boolean;
  reasoning: string;
}

interface PipelineOptimization {
  currentStage: string;
  nextStage: string;
  stageProgress: number;
  blockers: string[];
  opportunities: string[];
  recommendations: string[];
  timeToClose: string;
}

export class GeminiLeadOrganizer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_API_KEY no encontrada en variables de entorno');
      throw new Error('GOOGLE_API_KEY no encontrada');
    }
    
    console.log('🤖 Inicializando Gemini AI con clave API configurada');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  // ***** ANÁLISIS INTELIGENTE DE LEADS *****
  async analyzeLeadPriority(lead: Lead, recentMessages: Message[] = []): Promise<LeadAnalysis> {
    try {
      const messagesContext = recentMessages.length > 0 
        ? `Mensajes recientes: ${recentMessages.map(m => m.content).join('. ')}`
        : 'Sin mensajes recientes';

      const prompt = `
Analiza este lead y proporciona una evaluación detallada:

INFORMACIÓN DEL LEAD:
- Nombre: ${lead.name}
- Email: ${lead.email}
- Teléfono: ${lead.phone}
- Empresa: ${lead.company}
- Estado actual: ${lead.status}
- Presupuesto: ${lead.budget ? `$${lead.budget}` : 'No especificado'}
- Prioridad actual: ${lead.priority}
- Fuente: ${lead.source}
- Notas: ${lead.notes}
- ${messagesContext}

Proporciona un análisis en formato JSON con esta estructura exacta:
{
  "priority": "high|medium|low",
  "score": [número del 1-100],
  "category": "[categoría de lead: Enterprise, SMB, Startup, etc.]",
  "nextAction": "[acción específica recomendada]",
  "sentiment": "positive|neutral|negative",
  "conversionProbability": [porcentaje del 0-100],
  "reasoning": "[explicación del análisis]",
  "suggestedFollowUp": "[mensaje o acción de seguimiento específica]",
  "timeline": "[tiempo recomendado para siguiente contacto]"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
      // Extraer JSON del texto
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No se pudo extraer análisis válido');
    } catch (error) {
      console.error('Error en análisis de lead:', error);
      // Fallback con análisis básico
      return {
        priority: 'medium',
        score: 50,
        category: 'General',
        nextAction: 'Contactar para más información',
        sentiment: 'neutral',
        conversionProbability: 30,
        reasoning: 'Análisis básico aplicado',
        suggestedFollowUp: 'Enviar email de seguimiento',
        timeline: '2-3 días'
      };
    }
  }

  // ***** CLASIFICACIÓN INTELIGENTE DE TICKETS *****
  async classifyTicket(ticketData: any): Promise<TicketClassification> {
    try {
      const prompt = `
Clasifica este ticket de soporte técnico:

INFORMACIÓN DEL TICKET:
- Título: ${ticketData.title || 'Sin título'}
- Descripción: ${ticketData.description || 'Sin descripción'}
- Cliente: ${ticketData.customer || 'Desconocido'}
- Tipo: ${ticketData.type || 'General'}
- Canal: ${ticketData.channel || 'Email'}

Proporciona clasificación en formato JSON:
{
  "urgency": "urgent|high|medium|low",
  "category": "[Técnico, Billing, Feature Request, Bug, etc.]",
  "department": "[IT, Sales, Support, Product, etc.]",
  "estimatedResolutionTime": "[tiempo estimado]",
  "requiredSkills": ["habilidad1", "habilidad2"],
  "escalationNeeded": true/false,
  "reasoning": "[explicación de la clasificación]"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No se pudo extraer clasificación válida');
    } catch (error) {
      console.error('Error en clasificación de ticket:', error);
      return {
        urgency: 'medium',
        category: 'General',
        department: 'Support',
        estimatedResolutionTime: '24-48 horas',
        requiredSkills: ['Soporte general'],
        escalationNeeded: false,
        reasoning: 'Clasificación básica aplicada'
      };
    }
  }

  // ***** OPTIMIZACIÓN DEL PIPELINE DE VENTAS *****
  async optimizeSalesPipeline(lead: Lead, activities: Activity[]): Promise<PipelineOptimization> {
    try {
      const activitiesContext = activities.length > 0
        ? `Actividades: ${activities.map(a => `${a.type}: ${a.notes || 'Sin descripción'}`).join('. ')}`
        : 'Sin actividades registradas';

      const prompt = `
Analiza el progreso en el pipeline de ventas:

LEAD INFORMACIÓN:
- Estado: ${lead.status}
- Presupuesto: ${lead.budget}
- Prioridad: ${lead.priority}
- Fuente: ${lead.source}
- Días desde creación: ${lead.createdAt ? Math.floor((new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 'Desconocido'}
- ${activitiesContext}

Proporciona optimización en formato JSON:
{
  "currentStage": "[etapa actual del pipeline]",
  "nextStage": "[siguiente etapa recomendada]",
  "stageProgress": [porcentaje 0-100],
  "blockers": ["obstáculo1", "obstáculo2"],
  "opportunities": ["oportunidad1", "oportunidad2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "timeToClose": "[tiempo estimado para cerrar]"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No se pudo extraer optimización válida');
    } catch (error) {
      console.error('Error en optimización de pipeline:', error);
      return {
        currentStage: 'Contacto inicial',
        nextStage: 'Calificación',
        stageProgress: 25,
        blockers: ['Falta información de contacto'],
        opportunities: ['Interés mostrado'],
        recommendations: ['Programar llamada de descubrimiento'],
        timeToClose: '2-4 semanas'
      };
    }
  }

  // ***** ORGANIZADOR AUTOMÁTICO DE LEADS *****
  async organizeAllLeads(): Promise<{ organized: number, insights: string[], moved: number }> {
    try {
      console.log('🤖 Iniciando organización inteligente de leads con Gemini AI...');
      
      const leads = await storage.getAllLeads();
      const insights: string[] = [];
      let organized = 0;
      let moved = 0;

      for (const lead of leads) {
        try {
          // Analizar lead con contexto completo
          const messages = await storage.getMessagesByLead(lead.id);
          const activities = await storage.getActivitiesByLead(lead.id);
          
          const analysis = await this.analyzeLeadPriority(lead, messages);
          
          // Determinar si el lead necesita ser movido de estado
          const shouldMoveStatus = this.shouldMoveLeadStatus(lead, analysis);
          let newStatus = lead.status;
          
          if (shouldMoveStatus.move) {
            newStatus = shouldMoveStatus.newStatus;
            moved++;
            insights.push(`🔄 Lead ${lead.name} movido a estado: ${newStatus}`);
          }
          
          // Crear actividad automática si es necesario
          if (analysis.nextAction && analysis.nextAction !== 'Sin acción requerida') {
            await storage.createActivity({
              leadId: lead.id,
              userId: 1, // Usuario del sistema
              type: 'follow_up',
              notes: `[IA] ${analysis.nextAction} - ${analysis.suggestedFollowUp}`,
              scheduled: new Date(Date.now() + this.getTimelineInMs(analysis.timeline)),
              completed: false,
              priority: analysis.priority,
              reminder: new Date(Date.now() + this.getTimelineInMs(analysis.timeline) - (2 * 60 * 60 * 1000)) // 2h antes
            });
          }
          
          // Actualizar lead con análisis completo
          const updatedNotes = this.buildAIAnalysisNotes(lead.notes, analysis);
          await storage.updateLead(lead.id, {
            priority: analysis.priority,
            status: newStatus,
            notes: updatedNotes
          });

          insights.push(`✅ Lead ${lead.name}: Score ${analysis.score}/100, Prioridad: ${analysis.priority}`);
          organized++;
          
          // Pausa para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.error(`Error procesando lead ${lead.id}:`, error);
          insights.push(`❌ Error procesando ${lead.name}`);
        }
      }

      console.log(`✅ Organizados ${organized} leads, ${moved} movidos automáticamente`);
      return { organized, insights, moved };
    } catch (error) {
      console.error('Error en organización automática:', error);
      return { organized: 0, insights: ['Error en organización automática'], moved: 0 };
    }
  }

  // ***** FUNCIONES AUXILIARES PARA MOVIMIENTO AUTOMÁTICO *****
  private shouldMoveLeadStatus(lead: Lead, analysis: LeadAnalysis): { move: boolean, newStatus: string } {
    const currentStatus = lead.status || 'new';
    
    // Reglas de movimiento automático basadas en análisis de IA
    if (analysis.priority === 'high' && analysis.conversionProbability > 70) {
      if (currentStatus === 'new' || currentStatus === 'contacted') {
        return { move: true, newStatus: 'qualified' };
      }
    }
    
    if (analysis.sentiment === 'negative' && analysis.score < 30) {
      if (currentStatus !== 'lost') {
        return { move: true, newStatus: 'nurturing' };
      }
    }
    
    if (analysis.conversionProbability > 85 && analysis.priority === 'high') {
      if (currentStatus === 'qualified' || currentStatus === 'proposal') {
        return { move: true, newStatus: 'negotiation' };
      }
    }
    
    return { move: false, newStatus: currentStatus };
  }

  private getTimelineInMs(timeline: string): number {
    // Convertir timeline de texto a milisegundos
    if (timeline.includes('horas')) {
      const hours = parseInt(timeline.match(/\d+/)?.[0] || '24');
      return hours * 60 * 60 * 1000;
    }
    
    if (timeline.includes('días')) {
      const days = parseInt(timeline.match(/\d+/)?.[0] || '3');
      return days * 24 * 60 * 60 * 1000;
    }
    
    if (timeline.includes('semanas')) {
      const weeks = parseInt(timeline.match(/\d+/)?.[0] || '1');
      return weeks * 7 * 24 * 60 * 60 * 1000;
    }
    
    // Por defecto: 3 días
    return 3 * 24 * 60 * 60 * 1000;
  }

  private buildAIAnalysisNotes(existingNotes: string | null, analysis: LeadAnalysis): string {
    const timestamp = new Date().toLocaleString('es-ES');
    const aiAnalysis = `
[🤖 ANÁLISIS IA - ${timestamp}]
• Score: ${analysis.score}/100
• Categoría: ${analysis.category}
• Probabilidad conversión: ${analysis.conversionProbability}%
• Sentimiento: ${analysis.sentiment}
• Próxima acción: ${analysis.nextAction}
• Timeline: ${analysis.timeline}
• Razonamiento: ${analysis.reasoning}
`;
    
    return existingNotes ? `${existingNotes}\n\n${aiAnalysis}` : aiAnalysis;
  }

  // ***** GENERADOR DE REPORTES INTELIGENTES *****
  async generateSmartReport(leads: Lead[]): Promise<string> {
    try {
      const leadsSummary = leads.map(lead => ({
        name: lead.name,
        status: lead.status,
        priority: lead.priority,
        budget: lead.budget,
        source: lead.source
      }));

      const prompt = `
Genera un reporte ejecutivo inteligente basado en estos leads:

DATOS: ${JSON.stringify(leadsSummary, null, 2)}

El reporte debe incluir:
1. Resumen ejecutivo
2. Insights clave
3. Oportunidades identificadas
4. Recomendaciones estratégicas
5. Próximos pasos

Formato: Reporte profesional en español`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generando reporte:', error);
      return 'Error al generar reporte inteligente';
    }
  }

  // ***** GESTIÓN AUTOMÁTICA DE TICKETS *****
  async autoManageTickets(): Promise<{ processed: number, created: number, moved: number }> {
    try {
      console.log('🎫 Iniciando gestión automática de tickets con Gemini AI...');
      
      const recentMessages = await storage.getRecentMessages(50);
      const unassignedMessages = recentMessages.filter(msg => !msg.leadId);
      
      let processed = 0;
      let created = 0;
      let moved = 0;

      for (const message of unassignedMessages) {
        try {
          const ticketData = {
            title: `Mensaje automático: ${message.content.substring(0, 50)}...`,
            description: message.content,
            customer: 'Cliente desde WhatsApp',
            type: this.determineMessageType(message.content),
            channel: 'WhatsApp'
          };

          const classification = await this.classifyTicket(ticketData);
          
          if (classification.urgency === 'urgent' || classification.urgency === 'high') {
            const newLead = await storage.createLead({
              name: `Cliente Ticket #${Date.now()}`,
              email: `ticket-${Date.now()}@whatsapp.com`,
              phone: message.channel || 'WhatsApp',
              company: 'Auto-generado',
              source: 'WhatsApp AI',
              status: 'new',
              priority: classification.urgency === 'urgent' ? 'high' : 'medium',
              notes: `[🎫 TICKET AUTO-CREADO]\nUrgencia: ${classification.urgency}\nDepartamento: ${classification.department}\nTiempo estimado: ${classification.estimatedResolutionTime}\n\nMensaje original: ${message.content}`
            });

            await storage.createMessage({
              leadId: newLead.id,
              content: message.content,
              direction: 'incoming',
              channel: 'WhatsApp',
              read: false
            });

            created++;
          }

          processed++;
        } catch (error) {
          console.error(`Error procesando mensaje ${message.id}:`, error);
        }
      }

      const leads = await storage.getAllLeads();
      for (const lead of leads) {
        try {
          const activities = await storage.getActivitiesByLead(lead.id);
          const shouldMove = this.shouldMoveTicketStatus(lead, activities);
          
          if (shouldMove.move) {
            await storage.updateLead(lead.id, { status: shouldMove.newStatus });
            moved++;
          }
        } catch (error) {
          console.error(`Error gestionando ticket ${lead.id}:`, error);
        }
      }

      console.log(`🎫 Procesados ${processed} mensajes, ${created} tickets creados, ${moved} movidos`);
      return { processed, created, moved };
    } catch (error) {
      console.error('Error en gestión automática de tickets:', error);
      return { processed: 0, created: 0, moved: 0 };
    }
  }

  private determineMessageType(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('error') || lowerContent.includes('problema') || lowerContent.includes('falla')) {
      return 'Bug Report';
    }
    
    if (lowerContent.includes('precio') || lowerContent.includes('costo') || lowerContent.includes('pago')) {
      return 'Billing';
    }
    
    if (lowerContent.includes('nueva función') || lowerContent.includes('característica')) {
      return 'Feature Request';
    }
    
    if (lowerContent.includes('ayuda') || lowerContent.includes('consulta') || lowerContent.includes('pregunta')) {
      return 'Support';
    }
    
    return 'General';
  }

  private shouldMoveTicketStatus(lead: Lead, activities: Activity[]): { move: boolean, newStatus: string } {
    const currentStatus = lead.status || 'new';
    const lastActivity = activities.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];

    if (lastActivity) {
      const hoursSinceLastActivity = (Date.now() - new Date(lastActivity.createdAt || 0).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastActivity > 48 && currentStatus === 'contacted') {
        return { move: true, newStatus: 'follow_up_needed' };
      }
      
      if (hoursSinceLastActivity > 72 && currentStatus === 'follow_up_needed') {
        return { move: true, newStatus: 'nurturing' };
      }
    }

    return { move: false, newStatus: currentStatus };
  }

  // ***** SISTEMA DE GESTIÓN DE TARJETAS KANBAN *****
  async organizeKanbanCards(): Promise<{ organized: number, columns: any[] }> {
    try {
      console.log('📋 Organizando tarjetas Kanban con Gemini AI...');
      
      const leads = await storage.getAllLeads();
      const columns: { [key: string]: { leads: any[], count: number } } = {
        'nuevos': { leads: [], count: 0 },
        'contactados': { leads: [], count: 0 },
        'calificados': { leads: [], count: 0 },
        'propuesta': { leads: [], count: 0 },
        'negociacion': { leads: [], count: 0 },
        'cerrados': { leads: [], count: 0 },
        'perdidos': { leads: [], count: 0 }
      };

      for (const lead of leads) {
        const analysis = await this.analyzeLeadPriority(lead);
        const columnKey = this.mapStatusToColumn(lead.status || 'new');
        
        if (columns[columnKey]) {
          columns[columnKey].leads.push({
            ...lead,
            aiScore: analysis.score,
            aiPriority: analysis.priority,
            conversionProb: analysis.conversionProbability,
            nextAction: analysis.nextAction
          });
          columns[columnKey].count++;
        }
      }

      const organizedColumns = Object.entries(columns).map(([key, data]) => ({
        id: key,
        title: this.getColumnTitle(key),
        leads: data.leads.sort((a: any, b: any) => b.aiScore - a.aiScore),
        count: data.count
      }));

      console.log(`📋 Organizadas ${leads.length} tarjetas en ${organizedColumns.length} columnas`);
      return { organized: leads.length, columns: organizedColumns };
    } catch (error) {
      console.error('Error organizando tarjetas Kanban:', error);
      return { organized: 0, columns: [] };
    }
  }

  private mapStatusToColumn(status: string): string {
    const statusMap: { [key: string]: string } = {
      'new': 'nuevos',
      'contacted': 'contactados',
      'qualified': 'calificados',
      'proposal': 'propuesta',
      'negotiation': 'negociacion',
      'closed': 'cerrados',
      'lost': 'perdidos',
      'nurturing': 'contactados',
      'follow_up_needed': 'contactados'
    };
    
    return statusMap[status] || 'nuevos';
  }

  private getColumnTitle(key: string): string {
    const titles: { [key: string]: string } = {
      'nuevos': 'Nuevos Leads',
      'contactados': 'Contactados',
      'calificados': 'Calificados',
      'propuesta': 'En Propuesta',
      'negociacion': 'Negociación',
      'cerrados': 'Cerrados',
      'perdidos': 'Perdidos'
    };
    
    return titles[key] || 'Sin Categoría';
  }

  // ***** AUTOMATIZACIÓN COMPLETA DEL SISTEMA *****
  async runFullAutomation(): Promise<{ 
    leadsOrganized: number, 
    leadsMovedStatus: number,
    ticketsProcessed: number, 
    ticketsCreated: number,
    ticketsMoved: number,
    kanbanOrganized: number,
    summary: string[]
  }> {
    try {
      console.log('🚀 Ejecutando automatización completa del sistema con Gemini AI...');
      
      const summary: string[] = [];
      
      const leadsResult = await this.organizeAllLeads();
      summary.push(`✅ ${leadsResult.organized} leads organizados, ${leadsResult.moved} movidos de estado`);
      
      const ticketsResult = await this.autoManageTickets();
      summary.push(`🎫 ${ticketsResult.processed} mensajes procesados, ${ticketsResult.created} tickets creados`);
      
      const kanbanResult = await this.organizeKanbanCards();
      summary.push(`📋 ${kanbanResult.organized} tarjetas organizadas en tablero Kanban`);
      
      const activitiesCreated = await this.createFollowUpActivities();
      summary.push(`📅 ${activitiesCreated} actividades de seguimiento creadas`);
      
      summary.push(`🤖 Automatización completa finalizada exitosamente`);
      
      return {
        leadsOrganized: leadsResult.organized,
        leadsMovedStatus: leadsResult.moved,
        ticketsProcessed: ticketsResult.processed,
        ticketsCreated: ticketsResult.created,
        ticketsMoved: ticketsResult.moved,
        kanbanOrganized: kanbanResult.organized,
        summary
      };
    } catch (error) {
      console.error('Error en automatización completa:', error);
      return {
        leadsOrganized: 0,
        leadsMovedStatus: 0,
        ticketsProcessed: 0,
        ticketsCreated: 0,
        ticketsMoved: 0,
        kanbanOrganized: 0,
        summary: ['❌ Error en automatización completa']
      };
    }
  }

  private async createFollowUpActivities(): Promise<number> {
    try {
      const leads = await storage.getAllLeads();
      const highPriorityLeads = leads.filter(lead => lead.priority === 'high');
      let created = 0;

      for (const lead of highPriorityLeads) {
        const existingActivities = await storage.getActivitiesByLead(lead.id);
        const pendingActivities = existingActivities.filter(a => !a.completed);
        
        if (pendingActivities.length === 0) {
          await storage.createActivity({
            leadId: lead.id,
            userId: 1,
            type: 'follow_up',
            notes: '[IA] Seguimiento automático para lead de alta prioridad',
            scheduled: new Date(Date.now() + (24 * 60 * 60 * 1000)),
            completed: false,
            priority: 'high',
            reminder: new Date(Date.now() + (22 * 60 * 60 * 1000))
          });
          created++;
        }
      }

      return created;
    } catch (error) {
      console.error('Error creando actividades de seguimiento:', error);
      return 0;
    }
  }
}

export const geminiLeadOrganizer = new GeminiLeadOrganizer();