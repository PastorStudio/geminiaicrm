/**
 * Sistema de respuestas automáticas con DeepSeek AI
 * Integra DeepSeek con el sistema de WhatsApp para respuestas inteligentes
 */

import { deepSeekService } from './deepseekService';

export interface AutoResponseConfig {
  enabled: boolean;
  accountId: number;
  systemPrompt?: string;
  companyName?: string;
  responseDelay?: number; // segundos
  maxTokens?: number;
  temperature?: number;
}

export interface ProcessedMessage {
  success: boolean;
  response?: string;
  error?: string;
  processed: boolean;
  accountId: number;
  chatId: string;
  originalMessage: string;
}

export class DeepSeekAutoResponseManager {
  private activeConfigs: Map<number, AutoResponseConfig> = new Map();
  private processingQueue: Map<string, boolean> = new Map();

  /**
   * Activar respuestas automáticas para una cuenta
   */
  async activateAutoResponse(config: AutoResponseConfig): Promise<boolean> {
    try {
      console.log(`🤖 [DEEPSEEK-AUTO] Activando respuestas automáticas para cuenta ${config.accountId}`);
      
      // Verificar que DeepSeek esté configurado
      const isConnected = await deepSeekService.testConnection();
      if (!isConnected) {
        console.error('❌ [DEEPSEEK-AUTO] DeepSeek no está configurado correctamente');
        return false;
      }

      this.activeConfigs.set(config.accountId, config);
      console.log(`✅ [DEEPSEEK-AUTO] Respuestas automáticas activadas para cuenta ${config.accountId}`);
      return true;
    } catch (error) {
      console.error(`❌ [DEEPSEEK-AUTO] Error activando respuestas automáticas:`, error);
      return false;
    }
  }

  /**
   * Desactivar respuestas automáticas para una cuenta
   */
  deactivateAutoResponse(accountId: number): boolean {
    try {
      this.activeConfigs.delete(accountId);
      console.log(`🛑 [DEEPSEEK-AUTO] Respuestas automáticas desactivadas para cuenta ${accountId}`);
      return true;
    } catch (error) {
      console.error(`❌ [DEEPSEEK-AUTO] Error desactivando respuestas automáticas:`, error);
      return false;
    }
  }

  /**
   * Verificar si las respuestas automáticas están activas para una cuenta
   */
  isAutoResponseActive(accountId: number): boolean {
    return this.activeConfigs.has(accountId) && this.activeConfigs.get(accountId)?.enabled === true;
  }

  /**
   * Procesar mensaje recibido y generar respuesta automática
   */
  async processIncomingMessage(
    accountId: number,
    chatId: string,
    message: string,
    senderName?: string,
    senderPhone?: string
  ): Promise<ProcessedMessage> {
    const messageKey = `${accountId}-${chatId}`;
    
    try {
      // Verificar si ya se está procesando este chat
      if (this.processingQueue.get(messageKey)) {
        return {
          success: false,
          error: 'Mensaje ya en procesamiento',
          processed: false,
          accountId,
          chatId,
          originalMessage: message
        };
      }

      // Verificar si las respuestas automáticas están activas
      const config = this.activeConfigs.get(accountId);
      if (!config || !config.enabled) {
        return {
          success: false,
          error: 'Respuestas automáticas no activas para esta cuenta',
          processed: false,
          accountId,
          chatId,
          originalMessage: message
        };
      }

      // Marcar como en procesamiento
      this.processingQueue.set(messageKey, true);

      console.log(`🤖 [DEEPSEEK-AUTO] Procesando mensaje de ${senderName || senderPhone || 'usuario'} en cuenta ${accountId}`);

      // Aplicar delay si está configurado
      if (config.responseDelay && config.responseDelay > 0) {
        console.log(`⏰ [DEEPSEEK-AUTO] Esperando ${config.responseDelay} segundos antes de responder...`);
        await new Promise(resolve => setTimeout(resolve, config.responseDelay * 1000));
      }

      // Generar respuesta con DeepSeek
      const systemPrompt = config.systemPrompt || 
        `Eres un asistente de atención al cliente para ${config.companyName || 'nuestra empresa'}.
         Responde de manera profesional, amigable y útil.
         Mantén las respuestas concisas para WhatsApp.
         Si no tienes información específica, indica que un agente humano ayudará pronto.
         ${senderName ? `El cliente se llama ${senderName}.` : ''}`;

      const deepSeekResponse = await deepSeekService.generateResponse(
        message,
        `Cliente: ${senderName || 'Sin nombre'} (${senderPhone || 'Sin teléfono'})`,
        systemPrompt
      );

      // Limpiar de la cola de procesamiento
      this.processingQueue.delete(messageKey);

      if (deepSeekResponse.success && deepSeekResponse.response) {
        console.log(`✅ [DEEPSEEK-AUTO] Respuesta generada exitosamente para cuenta ${accountId}`);
        
        return {
          success: true,
          response: deepSeekResponse.response,
          processed: true,
          accountId,
          chatId,
          originalMessage: message
        };
      } else {
        console.error(`❌ [DEEPSEEK-AUTO] Error generando respuesta:`, deepSeekResponse.error);
        return {
          success: false,
          error: deepSeekResponse.error || 'Error generando respuesta',
          processed: false,
          accountId,
          chatId,
          originalMessage: message
        };
      }

    } catch (error) {
      // Limpiar de la cola de procesamiento
      this.processingQueue.delete(messageKey);
      
      console.error(`❌ [DEEPSEEK-AUTO] Error procesando mensaje:`, error);
      return {
        success: false,
        error: `Error interno: ${error.message}`,
        processed: false,
        accountId,
        chatId,
        originalMessage: message
      };
    }
  }

  /**
   * Obtener configuración de una cuenta
   */
  getAccountConfig(accountId: number): AutoResponseConfig | undefined {
    return this.activeConfigs.get(accountId);
  }

  /**
   * Obtener todas las configuraciones activas
   */
  getAllActiveConfigs(): AutoResponseConfig[] {
    return Array.from(this.activeConfigs.values());
  }

  /**
   * Actualizar configuración de una cuenta
   */
  updateAccountConfig(accountId: number, updates: Partial<AutoResponseConfig>): boolean {
    try {
      const currentConfig = this.activeConfigs.get(accountId);
      if (!currentConfig) {
        return false;
      }

      const newConfig = { ...currentConfig, ...updates };
      this.activeConfigs.set(accountId, newConfig);
      
      console.log(`✅ [DEEPSEEK-AUTO] Configuración actualizada para cuenta ${accountId}`);
      return true;
    } catch (error) {
      console.error(`❌ [DEEPSEEK-AUTO] Error actualizando configuración:`, error);
      return false;
    }
  }

  /**
   * Limpiar todas las configuraciones
   */
  clearAllConfigs(): void {
    this.activeConfigs.clear();
    this.processingQueue.clear();
    console.log(`🧹 [DEEPSEEK-AUTO] Todas las configuraciones limpiadas`);
  }

  /**
   * Obtener estadísticas del sistema
   */
  getStats() {
    return {
      activeAccounts: this.activeConfigs.size,
      processingMessages: this.processingQueue.size,
      accounts: Array.from(this.activeConfigs.keys())
    };
  }
}

// Instancia singleton
export const deepSeekAutoResponseManager = new DeepSeekAutoResponseManager();

export default deepSeekAutoResponseManager;