/**
 * Interceptor automático de mensajes para activar web scraping
 * Detecta mensajes entrantes y los procesa con agentes externos
 */

import { AutoWebScrapingHandler } from './autoWebScrapingHandler';

interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  to: string;
  timestamp: number;
  hasMedia: boolean;
  type: string;
}

export class MessageInterceptorService {
  private static activeAccounts = new Set<number>();
  private static processedMessages = new Set<string>();
  
  /**
   * Inicializar el interceptor para todas las cuentas activas
   */
  static async initialize() {
    console.log('🔍 Iniciando interceptor automático de mensajes...');
    
    // Inicializar el sistema de web scraping
    await AutoWebScrapingHandler.initialize();
    
    console.log('✅ Interceptor de mensajes iniciado correctamente');
  }
  
  /**
   * Interceptar y procesar mensaje entrante
   */
  static async interceptMessage(
    accountId: number,
    message: WhatsAppMessage
  ): Promise<void> {
    // Crear ID único para el mensaje
    const messageId = `${accountId}-${message.from}-${message.id}`;
    
    // Evitar procesamiento duplicado
    if (this.processedMessages.has(messageId)) {
      return;
    }
    
    this.processedMessages.add(messageId);
    
    // Limpiar cache de mensajes procesados (mantener solo últimos 1000)
    if (this.processedMessages.size > 1000) {
      const messagesToRemove = Array.from(this.processedMessages).slice(0, 500);
      messagesToRemove.forEach(id => this.processedMessages.delete(id));
    }
    
    // Verificar si la cuenta tiene web scraping automático activo
    if (!AutoWebScrapingHandler.isActiveForAccount(accountId)) {
      return;
    }
    
    // Filtrar mensajes del sistema y mensajes salientes
    if (this.shouldIgnoreMessage(message)) {
      return;
    }
    
    console.log(`📨 Mensaje interceptado en cuenta ${accountId}: ${message.body.substring(0, 50)}...`);
    
    // Procesar con web scraping automático
    try {
      const processed = await AutoWebScrapingHandler.processIncomingMessage({
        id: message.id,
        chatId: message.from,
        fromNumber: message.from,
        message: message.body,
        timestamp: new Date(message.timestamp * 1000),
        accountId: accountId
      });
      
      if (processed) {
        console.log(`✅ Respuesta automática generada para ${message.from}`);
      }
    } catch (error) {
      console.error(`❌ Error procesando mensaje interceptado:`, error);
    }
  }
  
  /**
   * Determinar si un mensaje debe ser ignorado
   */
  private static shouldIgnoreMessage(message: WhatsAppMessage): boolean {
    // Ignorar mensajes del sistema
    if (message.from.includes('@g.us') && message.body.includes('joined')) {
      return true;
    }
    
    // Ignorar mensajes de estado
    if (message.from.includes('status@broadcast')) {
      return true;
    }
    
    // Ignorar mensajes vacíos
    if (!message.body || message.body.trim().length === 0) {
      return true;
    }
    
    // Ignorar comandos del bot
    if (message.body.startsWith('/') || message.body.startsWith('!')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Activar interceptor para una cuenta específica
   */
  static activateForAccount(accountId: number, agentId: string): void {
    this.activeAccounts.add(accountId);
    AutoWebScrapingHandler.enableForAccount(accountId, agentId);
    console.log(`🔧 Interceptor activado para cuenta ${accountId} con agente ${agentId}`);
  }
  
  /**
   * Desactivar interceptor para una cuenta
   */
  static deactivateForAccount(accountId: number): void {
    this.activeAccounts.delete(accountId);
    AutoWebScrapingHandler.disableForAccount(accountId);
    console.log(`🔴 Interceptor desactivado para cuenta ${accountId}`);
  }
  
  /**
   * Verificar si una cuenta tiene interceptor activo
   */
  static isActiveForAccount(accountId: number): boolean {
    return this.activeAccounts.has(accountId);
  }
  
  /**
   * Obtener estadísticas del interceptor
   */
  static getStats(): {
    activeAccounts: number;
    processedMessages: number;
    webScrapingStats: any;
  } {
    return {
      activeAccounts: this.activeAccounts.size,
      processedMessages: this.processedMessages.size,
      webScrapingStats: AutoWebScrapingHandler.getStats()
    };
  }
}