import { db } from "../db";
import { eq, and, gte } from "drizzle-orm";

/**
 * Servicio para rastrear el estado en vivo de los agentes
 * Determina si un agente está actualmente activo en el sistema
 */
export class LiveStatusTracker {
  private activeAgents = new Map<number, Date>();
  private heartbeatInterval = 30000; // 30 segundos
  private sessionTimeout = 60000; // 1 minuto

  constructor() {
    // Limpiar sesiones inactivas cada minuto
    setInterval(() => this.cleanupInactiveSessions(), 60000);
  }

  /**
   * Marcar agente como activo (heartbeat)
   */
  async markAgentActive(agentId: number): Promise<void> {
    this.activeAgents.set(agentId, new Date());
    console.log(`💚 Agente ${agentId} marcado como activo`);
  }

  /**
   * Marcar agente como inactivo
   */
  async markAgentInactive(agentId: number): Promise<void> {
    this.activeAgents.delete(agentId);
    console.log(`⚫ Agente ${agentId} marcado como inactivo`);
  }

  /**
   * Verificar si un agente está activo
   */
  async isAgentActive(agentId: number): Promise<boolean> {
    return this.activeAgents.has(agentId);
  }

  /**
   * Obtener todos los agentes activos
   */
  async getActiveAgents(): Promise<number[]> {
    return Array.from(this.activeAgents.keys());
  }

  /**
   * Limpiar sesiones inactivas
   */
  private async cleanupInactiveSessions(): Promise<void> {
    // For now, we'll keep agents active until they explicitly disconnect
    // In a production environment, you might want to implement a heartbeat mechanism
    console.log('🧹 Cleanup routine executed (in-memory only)');
  }

  /**
   * Obtener estado de múltiples agentes
   */
  async getAgentsStatus(agentIds: number[]): Promise<Record<number, boolean>> {
    const status: Record<number, boolean> = {};
    
    for (const agentId of agentIds) {
      status[agentId] = await this.isAgentActive(agentId);
    }
    
    return status;
  }
}

export const liveStatusTracker = new LiveStatusTracker();