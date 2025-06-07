/**
 * Sistema simple de estado en vivo para agentes
 * Funciona sin base de datos usando memoria
 */
export class SimpleLiveStatusTracker {
  private activeAgents = new Map<number, Date>();
  private sessionTimeout = 90000; // 90 segundos

  constructor() {
    // Limpiar sesiones cada 30 segundos
    setInterval(() => {
      this.cleanupInactiveAgents();
    }, 30000);
  }

  /**
   * Marcar agente como activo
   */
  markAgentActive(agentId: number): void {
    this.activeAgents.set(agentId, new Date());
    console.log(`💚 Agente ${agentId} marcado como activo`);
  }

  /**
   * Verificar si un agente está activo
   */
  isAgentActive(agentId: number): boolean {
    const lastSeen = this.activeAgents.get(agentId);
    if (!lastSeen) return false;
    
    const now = new Date();
    const timeDiff = now.getTime() - lastSeen.getTime();
    return timeDiff < this.sessionTimeout;
  }

  /**
   * Obtener todos los agentes activos
   */
  getActiveAgents(): number[] {
    this.cleanupInactiveAgents();
    return Array.from(this.activeAgents.keys());
  }

  /**
   * Limpiar agentes inactivos
   */
  private cleanupInactiveAgents(): void {
    const now = new Date();
    const toRemove: number[] = [];

    for (const [agentId, lastSeen] of this.activeAgents.entries()) {
      const timeDiff = now.getTime() - lastSeen.getTime();
      if (timeDiff >= this.sessionTimeout) {
        toRemove.push(agentId);
      }
    }

    for (const agentId of toRemove) {
      this.activeAgents.delete(agentId);
      console.log(`⚫ Agente ${agentId} marcado como inactivo (timeout)`);
    }
  }
}

export const simpleLiveStatus = new SimpleLiveStatusTracker();