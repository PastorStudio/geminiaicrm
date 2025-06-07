/**
 * Sistema automático de tickets para WhatsApp
 * Convierte conversaciones en tickets y asigna agentes automáticamente
 */

import { db } from '../db';
import { storage } from '../storage';
import { 
  modernTickets, 
  agentMetrics, 
  messageActivity,
  users
} from '@shared/schema';
import { eq, desc, and, gte, count } from 'drizzle-orm';

export class AutomaticTicketingSystem {
  private ticketStatusRules = {
    'nuevo': ['hola', 'buenos días', 'buenas tardes', 'saludos', 'primera vez'],
    'interesado': ['precio', 'costo', 'quiero', 'necesito', 'información', 'cotización'],
    'pendiente_demo': ['demostración', 'demo', 'mostrar', 'ver funcionamiento', 'prueba'],
    'no_interesado': ['no gracias', 'no me interesa', 'tal vez después', 'no necesito'],
    'completado': ['gracias', 'perfecto', 'excelente', 'compramos', 'acepto']
  };

  /**
   * Procesa un nuevo mensaje y actualiza/crea tickets automáticamente
   */
  async processIncomingMessage(chatId: string, accountId: number, message: any): Promise<Ticket | null> {
    try {
      // Buscar si ya existe un ticket para este chat
      let existingTicket = await this.getTicketByChatId(chatId);
      
      const customerName = message.contact?.name || message.contact?.pushname || 'Cliente Anónimo';
      const customerPhone = message.from;
      const messageContent = message.body || '';

      if (!existingTicket) {
        // Crear nuevo ticket
        existingTicket = await this.createNewTicket({
          chatId,
          accountId,
          customerName,
          customerPhone,
          lastMessage: messageContent,
          status: this.analyzeMessageStatus(messageContent),
          priority: this.calculatePriority(messageContent),
          totalMessages: 1,
          unreadMessages: 1
        });

        // Asignar automáticamente a un agente
        await this.autoAssignTicket(existingTicket.id);
      } else {
        // Actualizar ticket existente
        const newStatus = this.analyzeMessageStatus(messageContent);
        await this.updateTicket(existingTicket.id, {
          lastMessage: messageContent,
          status: newStatus !== 'nuevo' ? newStatus : existingTicket.status,
          totalMessages: existingTicket.totalMessages + 1,
          unreadMessages: existingTicket.unreadMessages + 1,
          lastActivityAt: new Date()
        });
      }

      // Registrar actividad del mensaje
      await this.recordMessageActivity({
        ticketId: existingTicket.id,
        chatId,
        messageContent,
        direction: 'incoming',
        isRead: false
      });

      // Actualizar métricas del agente si está asignado
      if (existingTicket.assignedToId) {
        await this.updateAgentMetrics(existingTicket.assignedToId, 'message_received');
      }

      return existingTicket;
    } catch (error) {
      console.error('Error procesando mensaje entrante:', error);
      return null;
    }
  }

  /**
   * Procesa un mensaje saliente (del agente al cliente)
   */
  async processOutgoingMessage(chatId: string, userId: number, messageContent: string): Promise<void> {
    try {
      const ticket = await this.getTicketByChatId(chatId);
      if (!ticket) return;

      // Actualizar ticket
      await this.updateTicket(ticket.id, {
        answeredMessages: ticket.answeredMessages + 1,
        unreadMessages: Math.max(0, ticket.unreadMessages - 1),
        lastActivityAt: new Date()
      });

      // Registrar actividad del mensaje
      await this.recordMessageActivity({
        ticketId: ticket.id,
        userId,
        chatId,
        messageContent,
        direction: 'outgoing',
        isRead: true
      });

      // Actualizar métricas del agente
      await this.updateAgentMetrics(userId, 'message_sent');
    } catch (error) {
      console.error('Error procesando mensaje saliente:', error);
    }
  }

  /**
   * Analiza el contenido del mensaje para determinar el estado del ticket
   */
  private analyzeMessageStatus(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    for (const [status, keywords] of Object.entries(this.ticketStatusRules)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          return status;
        }
      }
    }
    
    return 'nuevo';
  }

  /**
   * Calcula la prioridad basada en el contenido del mensaje
   */
  private calculatePriority(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('urgente') || lowerMessage.includes('emergencia')) {
      return 'urgente';
    }
    if (lowerMessage.includes('importante') || lowerMessage.includes('pronto')) {
      return 'alta';
    }
    
    return 'media';
  }

  /**
   * Asigna automáticamente un ticket al agente con menor carga de trabajo
   */
  private async autoAssignTicket(ticketId: number): Promise<void> {
    try {
      // Obtener agentes activos ordenados por carga de trabajo
      const availableAgents = await db
        .select({
          userId: users.id,
          username: users.username,
          activeTickets: agentMetrics.activeTickets
        })
        .from(users)
        .leftJoin(agentMetrics, eq(users.id, agentMetrics.userId))
        .where(and(
          eq(users.status, 'active'),
          eq(users.role, 'agent')
        ))
        .orderBy(agentMetrics.activeTickets);

      if (availableAgents.length === 0) return;

      // Asignar al agente con menos tickets activos
      const selectedAgent = availableAgents[0];
      
      await db.update(tickets)
        .set({ assignedToId: selectedAgent.userId })
        .where(eq(tickets.id, ticketId));

      // Actualizar métricas del agente
      await this.updateAgentMetrics(selectedAgent.userId, 'ticket_assigned');
      
      console.log(`✅ Ticket ${ticketId} asignado automáticamente al agente ${selectedAgent.username}`);
    } catch (error) {
      console.error('Error en asignación automática:', error);
    }
  }

  /**
   * Actualiza las métricas de un agente
   */
  private async updateAgentMetrics(userId: number, action: string): Promise<void> {
    try {
      // Buscar métricas existentes
      const [existingMetrics] = await db
        .select()
        .from(agentMetrics)
        .where(eq(agentMetrics.userId, userId));

      if (!existingMetrics) {
        // Crear nuevas métricas
        await db.insert(agentMetrics).values({
          userId,
          totalMessagesSent: action === 'message_sent' ? 1 : 0,
          totalMessagesReceived: action === 'message_received' ? 1 : 0,
          activeTickets: action === 'ticket_assigned' ? 1 : 0
        });
      } else {
        // Actualizar métricas existentes
        const updates: any = { lastUpdated: new Date() };
        
        switch (action) {
          case 'message_sent':
            updates.totalMessagesSent = existingMetrics.totalMessagesSent + 1;
            break;
          case 'message_received':
            updates.totalMessagesReceived = existingMetrics.totalMessagesReceived + 1;
            break;
          case 'ticket_assigned':
            updates.activeTickets = existingMetrics.activeTickets + 1;
            break;
          case 'ticket_completed':
            updates.activeTickets = Math.max(0, existingMetrics.activeTickets - 1);
            updates.completedTickets = existingMetrics.completedTickets + 1;
            updates.ticketsSolvedToday = existingMetrics.ticketsSolvedToday + 1;
            break;
        }

        await db.update(agentMetrics)
          .set(updates)
          .where(eq(agentMetrics.userId, userId));
      }
    } catch (error) {
      console.error('Error actualizando métricas del agente:', error);
    }
  }

  /**
   * Obtiene un ticket por chat ID
   */
  private async getTicketByChatId(chatId: string): Promise<Ticket | null> {
    try {
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.chatId, chatId));
      
      return ticket || null;
    } catch (error) {
      console.error('Error obteniendo ticket por chat ID:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo ticket
   */
  private async createNewTicket(ticketData: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db
      .insert(tickets)
      .values(ticketData)
      .returning();
    
    console.log(`🎫 Nuevo ticket creado: ${newTicket.id} para chat ${ticketData.chatId}`);
    return newTicket;
  }

  /**
   * Actualiza un ticket existente
   */
  private async updateTicket(ticketId: number, updates: Partial<Ticket>): Promise<void> {
    await db.update(tickets)
      .set(updates)
      .where(eq(tickets.id, ticketId));
  }

  /**
   * Registra actividad de mensaje
   */
  private async recordMessageActivity(activityData: any): Promise<void> {
    await db.insert(messageActivity).values(activityData);
  }

  /**
   * Obtiene estadísticas de tickets por estado
   */
  async getTicketStats(): Promise<any> {
    try {
      const stats = await db
        .select({
          status: tickets.status,
          count: count()
        })
        .from(tickets)
        .groupBy(tickets.status);

      return {
        nuevo: stats.find(s => s.status === 'nuevo')?.count || 0,
        interesado: stats.find(s => s.status === 'interesado')?.count || 0,
        no_leido: stats.find(s => s.status === 'no_leido')?.count || 0,
        pendiente_demo: stats.find(s => s.status === 'pendiente_demo')?.count || 0,
        completado: stats.find(s => s.status === 'completado')?.count || 0,
        no_interesado: stats.find(s => s.status === 'no_interesado')?.count || 0,
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de tickets:', error);
      return {};
    }
  }

  /**
   * Obtiene todos los tickets con paginación
   */
  async getAllTickets(page: number = 1, limit: number = 50): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      const allTickets = await db
        .select({
          ticket: tickets,
          agentName: users.fullName,
          agentUsername: users.username
        })
        .from(tickets)
        .leftJoin(users, eq(tickets.assignedToId, users.id))
        .orderBy(desc(tickets.lastActivityAt))
        .limit(limit)
        .offset(offset);

      return allTickets;
    } catch (error) {
      console.error('Error obteniendo todos los tickets:', error);
      return [];
    }
  }

  /**
   * Marca mensajes como leídos
   */
  async markMessagesAsRead(chatId: string): Promise<void> {
    try {
      const ticket = await this.getTicketByChatId(chatId);
      if (!ticket) return;

      await this.updateTicket(ticket.id, {
        unreadMessages: 0
      });

      await db.update(messageActivity)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(messageActivity.chatId, chatId),
          eq(messageActivity.isRead, false)
        ));
    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error);
    }
  }
}

export const ticketingSystem = new AutomaticTicketingSystem();