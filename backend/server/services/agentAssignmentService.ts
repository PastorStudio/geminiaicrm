import { db } from '../db';
import { chatAssignments, chatComments, users, whatsappAccounts } from '@shared/schema';
import { eq, and, desc, count } from 'drizzle-orm';

/**
 * Servicio de asignaciones de agentes independiente de WhatsApp
 * Este sistema funciona de manera invisible para el usuario final
 * pero permite al CRM rastrear qué agente está trabajando con cada chat
 */

export interface AgentAssignment {
  id: number;
  chatId: string;
  accountId: number;
  assignedToId: number;
  assignedById?: number;
  category?: string;
  status: string;
  notes?: string;
  assignedAt: Date;
  lastActivityAt?: Date;
  agentName?: string;
  assignedByName?: string;
}

export interface AgentWorkload {
  agentId: number;
  agentName: string;
  activeChats: number;
  totalChats: number;
  department?: string;
  role?: string;
}

export class AgentAssignmentService {
  
  /**
   * Asignar un chat a un agente específico (función invisible al usuario final)
   */
  async assignChatToAgent(
    chatId: string,
    accountId: number,
    assignedToId: number,
    assignedById?: number,
    options?: {
      category?: string;
      notes?: string;
      forceReassign?: boolean;
    }
  ): Promise<AgentAssignment | null> {
    
    // SISTEMA DE ASIGNACIÓN AUTOMÁTICA DESACTIVADO
    console.log('⚠️ Sistema de asignación automática desactivado - ignorando asignación automática');
    if (!assignedById) {
      console.log('❌ Asignación automática bloqueada - solo se permiten asignaciones manuales');
      return null;
    }
    try {
      // Verificar si ya existe una asignación activa
      const existingAssignment = await db
        .select()
        .from(chatAssignments)
        .where(
          and(
            eq(chatAssignments.chatId, chatId),
            eq(chatAssignments.accountId, accountId),
            eq(chatAssignments.status, 'active')
          )
        )
        .limit(1);

      // Si existe y no es reasignación forzada, actualizar la existente
      if (existingAssignment.length > 0 && !options?.forceReassign) {
        const [updated] = await db
          .update(chatAssignments)
          .set({
            assignedToId,
            assignedById,
            category: options?.category,
            notes: options?.notes,
            lastActivityAt: new Date()
          })
          .where(eq(chatAssignments.id, existingAssignment[0].id))
          .returning();

        return await this.getAssignmentWithAgentInfo(updated.id);
      }

      // Cerrar asignación anterior si existe
      if (existingAssignment.length > 0) {
        await db
          .update(chatAssignments)
          .set({ status: 'transferred' })
          .where(eq(chatAssignments.id, existingAssignment[0].id));
      }

      // Crear nueva asignación
      const [newAssignment] = await db
        .insert(chatAssignments)
        .values({
          chatId,
          accountId,
          assignedToId,
          assignedById,
          category: options?.category,
          notes: options?.notes,
          status: 'active',
          assignedAt: new Date(),
          lastActivityAt: new Date()
        })
        .returning();

      console.log(`🔄 Chat ${chatId} asignado invisiblemente al agente ${assignedToId}`);
      
      return await this.getAssignmentWithAgentInfo(newAssignment.id);
    } catch (error) {
      console.error('Error asignando chat a agente:', error);
      return null;
    }
  }

  /**
   * Obtener la asignación actual de un chat
   */
  async getChatAssignment(chatId: string, accountId: number): Promise<AgentAssignment | null> {
    try {
      const assignment = await db
        .select()
        .from(chatAssignments)
        .where(
          and(
            eq(chatAssignments.chatId, chatId),
            eq(chatAssignments.accountId, accountId),
            eq(chatAssignments.status, 'active')
          )
        )
        .orderBy(desc(chatAssignments.assignedAt))
        .limit(1);

      if (assignment.length === 0) return null;

      return await this.getAssignmentWithAgentInfo(assignment[0].id);
    } catch (error) {
      console.error('Error obteniendo asignación de chat:', error);
      return null;
    }
  }

  /**
   * Asignación automática basada en carga de trabajo
   */
  async autoAssignChat(
    chatId: string,
    accountId: number,
    category?: string
  ): Promise<AgentAssignment | null> {
    try {
      // Obtener agentes disponibles para esta cuenta
      const availableAgents = await this.getAvailableAgents(accountId);
      
      if (availableAgents.length === 0) {
        console.log(`⚠️ No hay agentes disponibles para auto-asignar chat ${chatId}`);
        return null;
      }

      // Encontrar el agente con menor carga de trabajo
      const bestAgent = availableAgents.reduce((prev, current) => {
        return current.activeChats < prev.activeChats ? current : prev;
      });

      console.log(`🤖 Auto-asignando chat ${chatId} al agente ${bestAgent.agentName} (${bestAgent.activeChats} chats activos)`);

      return await this.assignChatToAgent(
        chatId,
        accountId,
        bestAgent.agentId,
        undefined, // Sin assignedBy para asignación automática
        {
          category,
          notes: 'Asignación automática basada en carga de trabajo'
        }
      );
    } catch (error) {
      console.error('Error en auto-asignación:', error);
      return null;
    }
  }

  /**
   * Obtener carga de trabajo de todos los agentes
   */
  async getAgentWorkloads(): Promise<AgentWorkload[]> {
    try {
      const workloads = await db
        .select({
          agentId: users.id,
          agentName: users.fullName,
          department: users.department,
          role: users.role,
          activeChats: count(chatAssignments.id)
        })
        .from(users)
        .leftJoin(
          chatAssignments,
          and(
            eq(chatAssignments.assignedToId, users.id),
            eq(chatAssignments.status, 'active')
          )
        )
        .where(eq(users.status, 'active'))
        .groupBy(users.id, users.fullName, users.department, users.role);

      return workloads.map(w => ({
        agentId: w.agentId,
        agentName: w.agentName || `Usuario ${w.agentId}`,
        activeChats: w.activeChats || 0,
        totalChats: w.activeChats || 0,
        department: w.department,
        role: w.role
      }));
    } catch (error) {
      console.error('Error obteniendo carga de trabajo:', error);
      return [];
    }
  }

  /**
   * Cerrar asignación de chat
   */
  async closeChatAssignment(chatId: string, accountId: number, notes?: string): Promise<boolean> {
    try {
      const result = await db
        .update(chatAssignments)
        .set({
          status: 'closed',
          notes,
          lastActivityAt: new Date()
        })
        .where(
          and(
            eq(chatAssignments.chatId, chatId),
            eq(chatAssignments.accountId, accountId),
            eq(chatAssignments.status, 'active')
          )
        );

      console.log(`✅ Chat ${chatId} cerrado invisiblemente`);
      return true;
    } catch (error) {
      console.error('Error cerrando asignación:', error);
      return false;
    }
  }

  /**
   * Actualizar actividad del chat (llamar cuando hay nueva actividad)
   */
  async updateChatActivity(chatId: string, accountId: number): Promise<void> {
    try {
      await db
        .update(chatAssignments)
        .set({ lastActivityAt: new Date() })
        .where(
          and(
            eq(chatAssignments.chatId, chatId),
            eq(chatAssignments.accountId, accountId),
            eq(chatAssignments.status, 'active')
          )
        );
    } catch (error) {
      console.error('Error actualizando actividad del chat:', error);
    }
  }

  /**
   * Obtener agentes disponibles para una cuenta
   */
  private async getAvailableAgents(accountId: number): Promise<AgentWorkload[]> {
    try {
      // Por ahora, obtener todos los agentes activos
      // En el futuro se puede filtrar por permisos de cuenta específica
      const agents = await db
        .select({
          agentId: users.id,
          agentName: users.fullName,
          department: users.department,
          role: users.role
        })
        .from(users)
        .where(
          and(
            eq(users.status, 'active'),
            eq(users.role, 'agent') // Solo agentes
          )
        );

      // Obtener carga de trabajo actual para cada agente
      const workloads: AgentWorkload[] = [];
      for (const agent of agents) {
        const activeChats = await db
          .select({ count: count() })
          .from(chatAssignments)
          .where(
            and(
              eq(chatAssignments.assignedToId, agent.agentId),
              eq(chatAssignments.status, 'active')
            )
          );

        workloads.push({
          agentId: agent.agentId,
          agentName: agent.agentName || `Usuario ${agent.agentId}`,
          activeChats: activeChats[0]?.count || 0,
          totalChats: activeChats[0]?.count || 0,
          department: agent.department,
          role: agent.role
        });
      }

      return workloads;
    } catch (error) {
      console.error('Error obteniendo agentes disponibles:', error);
      return [];
    }
  }

  /**
   * Obtener información completa de asignación con datos del agente
   */
  private async getAssignmentWithAgentInfo(assignmentId: number): Promise<AgentAssignment | null> {
    try {
      const result = await db
        .select({
          id: chatAssignments.id,
          chatId: chatAssignments.chatId,
          accountId: chatAssignments.accountId,
          assignedToId: chatAssignments.assignedToId,
          assignedById: chatAssignments.assignedById,
          category: chatAssignments.category,
          status: chatAssignments.status,
          notes: chatAssignments.notes,
          assignedAt: chatAssignments.assignedAt,
          lastActivityAt: chatAssignments.lastActivityAt,
          agentName: users.fullName,
          assignedByName: users.fullName
        })
        .from(chatAssignments)
        .leftJoin(users, eq(chatAssignments.assignedToId, users.id))
        .where(eq(chatAssignments.id, assignmentId))
        .limit(1);

      if (result.length === 0) return null;

      const assignment = result[0];
      return {
        id: assignment.id,
        chatId: assignment.chatId,
        accountId: assignment.accountId,
        assignedToId: assignment.assignedToId,
        assignedById: assignment.assignedById,
        category: assignment.category,
        status: assignment.status,
        notes: assignment.notes,
        assignedAt: assignment.assignedAt!,
        lastActivityAt: assignment.lastActivityAt,
        agentName: assignment.agentName || `Usuario ${assignment.assignedToId}`,
        assignedByName: assignment.assignedByName
      };
    } catch (error) {
      console.error('Error obteniendo información de asignación:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de asignaciones por agente
   */
  async getAgentStats(): Promise<any[]> {
    try {
      const stats = await db
        .select({
          agentId: users.id,
          agentName: users.fullName,
          department: users.department,
          role: users.role,
          activeChats: count(chatAssignments.id),
        })
        .from(users)
        .leftJoin(
          chatAssignments,
          and(
            eq(chatAssignments.assignedToId, users.id),
            eq(chatAssignments.status, 'active')
          )
        )
        .where(eq(users.status, 'active'))
        .groupBy(users.id, users.fullName, users.department, users.role);

      return stats.map(stat => ({
        agentId: stat.agentId,
        agentName: stat.agentName || `Usuario ${stat.agentId}`,
        department: stat.department,
        role: stat.role,
        activeChats: stat.activeChats || 0
      }));
    } catch (error) {
      console.error('Error obteniendo estadísticas de agentes:', error);
      return [];
    }
  }
}

// Instancia singleton del servicio
export const agentAssignmentService = new AgentAssignmentService();