/**
 * Servicio de gestión inteligente que utiliza MiniMax AI
 * Para automatizar la creación de leads, tickets y análisis de conversaciones
 */

import { storage } from '../storage';
import { nativeIntelligence } from './nativeIntelligenceService';

export interface AutoAnalysisResult {
  leadCreated?: boolean;
  ticketCreated?: boolean;
  analysis: {
    sentiment: string;
    intent: string;
    priority: string;
    category: string;
    confidence: number;
  };
  recommendations: string[];
}

export class IntelligentManagementService {
  
  /**
   * Analiza una conversación y ejecuta acciones automáticas
   */
  async processConversation(
    chatId: string,
    messages: any[],
    contactInfo: any,
    accountId: number
  ): Promise<AutoAnalysisResult> {
    
    try {
      // 1. Analizar la conversación con sistema nativo
      const analysis = nativeIntelligence.analyzeConversation(messages);
      
      let leadCreated = false;
      let ticketCreated = false;
      const recommendations: string[] = [];

      // 2. Determinar si crear un lead
      if (analysis.leadQuality === 'high' || analysis.leadQuality === 'medium') {
        try {
          const leadData = nativeIntelligence.generateLeadFromConversation(messages, contactInfo);
          
          // Verificar si ya existe un lead para este contacto
          const existingLeads = await storage.getAllLeads();
          const existingLead = existingLeads.find(lead => 
            lead.phone === contactInfo.phone || lead.email === leadData.email
          );

          if (!existingLead && leadData.confidence > 0.3) {
            await storage.createLead({
              name: leadData.name,
              email: leadData.email || `${contactInfo.phone}@whatsapp.contact`,
              phone: leadData.phone,
              company: leadData.company,
              source: 'whatsapp',
              status: leadData.status,
              notes: leadData.notes,
              priority: leadData.priority,
              assigneeId: null,
              budget: 0
            });
            
            leadCreated = true;
            recommendations.push('Lead creado automáticamente');
          }
        } catch (error) {
          console.error('Error creating lead:', error);
          recommendations.push('Error al crear lead - revisión manual requerida');
        }
      }

      // 3. Determinar si crear un ticket
      if (analysis.priority === 'urgent' || analysis.priority === 'high' || 
          analysis.category === 'soporte' || analysis.category === 'reclamo') {
        try {
          const ticketInfo = nativeIntelligence.categorizeTicket(messages);
          
          // Crear asignación de chat (equivalente a ticket)
          const existingAssignment = await storage.getChatAssignments();
          const hasAssignment = existingAssignment.find(assignment => 
            assignment.chatId === chatId
          );

          if (!hasAssignment) {
            await storage.createChatAssignment({
              chatId: chatId,
              accountId: accountId,
              assignedToId: null, // Se asignará manualmente o por reglas
              assignedById: 1, // Sistema
              status: 'active',
              priority: ticketInfo.priority,
              category: ticketInfo.category,
              notes: `Ticket automático: ${ticketInfo.description}`
            });
            
            ticketCreated = true;
            recommendations.push('Ticket creado automáticamente');
          }
        } catch (error) {
          console.error('Error creating ticket:', error);
          recommendations.push('Error al crear ticket - revisión manual requerida');
        }
      }

      // 4. Generar recomendaciones adicionales
      analysis.suggestedActions.forEach(action => {
        recommendations.push(action);
      });

      // 5. Recomendaciones basadas en el análisis
      if (analysis.sentiment === 'negative') {
        recommendations.push('Atención prioritaria requerida - cliente insatisfecho');
      }
      
      if (analysis.confidence < 0.5) {
        recommendations.push('Análisis con baja confianza - revisión manual recomendada');
      }

      return {
        leadCreated,
        ticketCreated,
        analysis: {
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          priority: analysis.priority,
          category: analysis.category,
          confidence: analysis.confidence
        },
        recommendations
      };

    } catch (error) {
      console.error('Error in intelligent conversation processing:', error);
      
      // Retorno de fallback en caso de error
      return {
        leadCreated: false,
        ticketCreated: false,
        analysis: {
          sentiment: 'neutral',
          intent: 'Análisis no disponible',
          priority: 'medium',
          category: 'general',
          confidence: 0.1
        },
        recommendations: ['Error en análisis automático - revisión manual requerida']
      };
    }
  }

  /**
   * Procesa un mensaje entrante y determina acciones automáticas
   */
  async processIncomingMessage(
    chatId: string,
    message: any,
    contactInfo: any,
    accountId: number,
    allMessages: any[] = []
  ): Promise<{shouldRespond: boolean, response?: string, analysis?: AutoAnalysisResult}> {
    
    try {
      // Si hay suficientes mensajes para análisis (mínimo 2)
      if (allMessages.length >= 2) {
        const analysis = await this.processConversation(chatId, allMessages, contactInfo, accountId);
        
        // Determinar si debe responder automáticamente
        let shouldRespond = false;
        let response = '';

        // Responder automáticamente si es una consulta simple o saludo
        if (analysis.analysis.category === 'consulta' && 
            analysis.analysis.sentiment !== 'negative' &&
            analysis.analysis.confidence > 0.6) {
          
          try {
            const autoResponse = nativeIntelligence.generateAutoResponse(allMessages, {
              agentName: 'Asistente Virtual',
              company: 'Nuestra empresa'
            });
            response = autoResponse.response;
            shouldRespond = true;
          } catch (error) {
            console.error('Error generating auto response:', error);
          }
        }

        return {
          shouldRespond,
          response,
          analysis
        };
      }

      // Para mensajes individuales, solo respuesta básica si es necesario
      return {
        shouldRespond: false,
        response: '',
        analysis: undefined
      };

    } catch (error) {
      console.error('Error processing incoming message:', error);
      return {
        shouldRespond: false,
        response: '',
        analysis: undefined
      };
    }
  }

  /**
   * Actualiza estadísticas del dashboard basado en análisis de IA
   */
  async updateDashboardWithAIData(): Promise<void> {
    try {
      const leads = await storage.getAllLeads();
      const users = await storage.getAllUsers();
      
      // Calcular métricas básicas
      const totalLeads = leads.length;
      const newLeadsThisMonth = leads.filter(lead => {
        const created = new Date(lead.createdAt || '');
        const now = new Date();
        return created.getMonth() === now.getMonth() && 
               created.getFullYear() === now.getFullYear();
      }).length;

      const activeLeads = leads.filter(lead => 
        lead.status === 'new' || lead.status === 'interested'
      ).length;

      const convertedLeads = leads.filter(lead => 
        lead.status === 'converted'
      ).length;

      // Actualizar estadísticas
      await storage.updateDashboardStats({
        totalLeads,
        newLeadsThisMonth,
        activeLeads,
        convertedLeads,
        totalSales: 0, // Se puede calcular basado en leads convertidos
        salesThisMonth: 0,
        pendingActivities: activeLeads, // Aproximación
        completedActivities: convertedLeads,
        performanceMetrics: {
          responseTime: 0,
          conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
          customerSatisfaction: 85 // Valor por defecto
        }
      });

    } catch (error) {
      console.error('Error updating dashboard with AI data:', error);
    }
  }

  /**
   * Obtiene recomendaciones de asignación de agentes basadas en análisis
   */
  async getAgentAssignmentRecommendations(
    analysis: any,
    availableAgents: any[]
  ): Promise<{agentId: number | null, reason: string}> {
    
    try {
      // Lógica de asignación basada en categoría y prioridad
      if (analysis.category === 'soporte' && analysis.priority === 'urgent') {
        // Buscar agente de soporte disponible
        const supportAgent = availableAgents.find(agent => 
          agent.department === 'soporte' && agent.status === 'active'
        );
        if (supportAgent) {
          return {
            agentId: supportAgent.id,
            reason: 'Asignado a soporte por urgencia técnica'
          };
        }
      }

      if (analysis.category === 'ventas' && analysis.leadQuality === 'high') {
        // Buscar agente de ventas disponible
        const salesAgent = availableAgents.find(agent => 
          agent.department === 'ventas' && agent.status === 'active'
        );
        if (salesAgent) {
          return {
            agentId: salesAgent.id,
            reason: 'Asignado a ventas por lead de alta calidad'
          };
        }
      }

      // Asignación por disponibilidad general
      const availableAgent = availableAgents.find(agent => 
        agent.status === 'active'
      );
      
      if (availableAgent) {
        return {
          agentId: availableAgent.id,
          reason: 'Asignado por disponibilidad general'
        };
      }

      return {
        agentId: null,
        reason: 'No hay agentes disponibles'
      };

    } catch (error) {
      console.error('Error getting agent assignment recommendations:', error);
      return {
        agentId: null,
        reason: 'Error en recomendación de asignación'
      };
    }
  }
}

// Instancia singleton del servicio
export const intelligentManager = new IntelligentManagementService();