/**
 * Servicio de respuestas automáticas usando web scraping
 * Integra el sistema de Selenium para automatizar agentes externos
 */

import { seleniumIntegration } from './seleniumIntegrationService';
import { SimpleExternalAgentManager } from './externalAgentsSimple';

interface WebScrapingResponse {
  success: boolean;
  response?: string;
  error?: string;
  agentUsed?: string;
  processingTime?: number;
}

export class WebScrapingAutoResponseService {
  private static isEnabled = false;
  private static activeAgents = new Map<string, any>();

  /**
   * Activar el sistema de respuestas automáticas por web scraping
   */
  static enable() {
    this.isEnabled = true;
    console.log('🕷️ Sistema de respuestas automáticas por web scraping ACTIVADO');
  }

  /**
   * Desactivar el sistema
   */
  static disable() {
    this.isEnabled = false;
    console.log('🛑 Sistema de respuestas automáticas por web scraping DESACTIVADO');
  }

  /**
   * Verificar si está habilitado
   */
  static isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Generar respuesta automática usando web scraping
   */
  static async generateAutoResponse(
    message: string,
    fromNumber: string,
    agentId?: string
  ): Promise<WebScrapingResponse> {
    const startTime = Date.now();

    try {
      if (!this.isEnabled) {
        return {
          success: false,
          error: 'Servicio de web scraping desactivado'
        };
      }

      console.log(`🕷️ Generando respuesta automática por web scraping para: ${fromNumber}`);

      // Obtener agente asignado o usar uno por defecto
      let targetAgent;
      
      if (agentId) {
        targetAgent = SimpleExternalAgentManager.getAgent(agentId);
      } else {
        // Usar el primer agente activo disponible
        const allAgents = SimpleExternalAgentManager.getAllAgents();
        targetAgent = allAgents.find(agent => agent.isActive);
      }

      if (!targetAgent) {
        return {
          success: false,
          error: 'No hay agentes externos disponibles para web scraping'
        };
      }

      console.log(`🎯 Usando agente: ${targetAgent.name} (${targetAgent.agentUrl})`);

      // Preparar mensaje con contexto
      const contextualMessage = this.prepareContextualMessage(message, fromNumber);

      // Obtener respuesta usando Selenium
      const seleniumResult = await seleniumIntegration.getAgentResponseWithRetry(
        targetAgent.agentUrl,
        contextualMessage,
        targetAgent.id,
        3 // máximo 3 reintentos
      );

      const processingTime = Date.now() - startTime;

      if (seleniumResult.success && seleniumResult.response) {
        // Actualizar estadísticas del agente
        this.updateAgentStats(targetAgent.id, true, processingTime);

        // Procesar y limpiar la respuesta
        const cleanResponse = this.processResponse(seleniumResult.response);

        console.log(`✅ Respuesta generada por web scraping en ${processingTime}ms`);
        
        return {
          success: true,
          response: cleanResponse,
          agentUsed: targetAgent.name,
          processingTime
        };
      } else {
        this.updateAgentStats(targetAgent.id, false, processingTime);
        
        return {
          success: false,
          error: seleniumResult.error || 'No se pudo obtener respuesta del agente',
          agentUsed: targetAgent.name,
          processingTime
        };
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Error en generateAutoResponse:', error);
      
      return {
        success: false,
        error: `Error interno: ${error}`,
        processingTime
      };
    }
  }

  /**
   * Preparar mensaje con contexto para el agente
   */
  private static prepareContextualMessage(message: string, fromNumber: string): string {
    const timestamp = new Date().toLocaleString('es-ES', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `Como asistente empresarial profesional, responde en español de manera cordial y útil al siguiente mensaje recibido por WhatsApp:

MENSAJE DEL CLIENTE: "${message}"
NÚMERO DEL CLIENTE: ${fromNumber}
FECHA/HORA: ${timestamp}

Por favor, proporciona una respuesta profesional, cordial y en español que sea apropiada para un contexto empresarial de WhatsApp Business. La respuesta debe ser:
- Concisa pero completa
- Profesional pero amigable  
- En español
- Directamente relacionada con la consulta del cliente

RESPUESTA:`;
  }

  /**
   * Procesar y limpiar la respuesta del agente
   */
  private static processResponse(rawResponse: string): string {
    // Eliminar texto común de introducción de ChatGPT
    let cleaned = rawResponse
      .replace(/^(Aquí tienes una respuesta|Como asistente|Respuesta:|RESPUESTA:)/i, '')
      .replace(/^(Here's a response|As an assistant)/i, '')
      .trim();

    // Limitar longitud para WhatsApp (máximo 4096 caracteres)
    if (cleaned.length > 4000) {
      cleaned = cleaned.substring(0, 3950) + '...';
    }

    // Asegurar que empiece con mayúscula
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned || 'Gracias por tu mensaje. Estamos procesando tu consulta y te responderemos pronto.';
  }

  /**
   * Actualizar estadísticas del agente
   */
  private static updateAgentStats(agentId: string, success: boolean, processingTime: number) {
    try {
      const agent = SimpleExternalAgentManager.getAgent(agentId);
      if (agent) {
        // Incrementar contador de respuestas
        agent.responseCount = (agent.responseCount || 0) + 1;

        // Actualizar tiempo promedio (simplificado)
        if (success) {
          console.log(`📊 Agente ${agent.name}: Respuesta exitosa en ${processingTime}ms`);
        } else {
          console.log(`⚠️ Agente ${agent.name}: Respuesta fallida después de ${processingTime}ms`);
        }
      }
    } catch (error) {
      console.error('❌ Error actualizando estadísticas del agente:', error);
    }
  }

  /**
   * Obtener estadísticas del servicio
   */
  static getServiceStats() {
    const allAgents = SimpleExternalAgentManager.getAllAgents();
    const totalResponses = allAgents.reduce((sum, agent) => sum + (agent.responseCount || 0), 0);
    const activeAgents = allAgents.filter(agent => agent.isActive).length;

    return {
      enabled: this.isEnabled,
      totalAgents: allAgents.length,
      activeAgents,
      totalResponses,
      serviceType: 'Web Scraping (Selenium)'
    };
  }

  /**
   * Verificar disponibilidad del sistema
   */
  static async checkSystemAvailability(): Promise<boolean> {
    try {
      const isSeleniumAvailable = await seleniumIntegration.isAvailable();
      const hasActiveAgents = SimpleExternalAgentManager.getAllAgents()
        .some(agent => agent.isActive);

      return isSeleniumAvailable && hasActiveAgents;
    } catch (error) {
      console.error('❌ Error verificando disponibilidad del sistema:', error);
      return false;
    }
  }
}

export default WebScrapingAutoResponseService;