/**
 * Sistema automático de web scraping para respuestas de agentes externos
 * Detecta mensajes nuevos, consulta agentes externos y envía respuestas automáticamente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from '../storage';

const execAsync = promisify(exec);

interface AutoScrapingConfig {
  accountId: number;
  agentId: string;
  agentUrl: string;
  isActive: boolean;
}

interface IncomingMessage {
  id: string;
  chatId: string;
  fromNumber: string;
  message: string;
  timestamp: Date;
  accountId: number;
}

export class AutoWebScrapingHandler {
  private static activeConfigs = new Map<number, AutoScrapingConfig>();
  private static isProcessing = new Set<string>();
  
  /**
   * Inicializar el sistema de web scraping automático
   */
  static async initialize() {
    console.log('🚀 Iniciando sistema automático de web scraping...');
    
    // Cargar configuraciones activas desde la base de datos
    await this.loadActiveConfigurations();
    
    console.log(`✅ Sistema de web scraping iniciado con ${this.activeConfigs.size} cuentas configuradas`);
  }
  
  /**
   * Cargar configuraciones activas de las cuentas
   */
  private static async loadActiveConfigurations() {
    try {
      const accounts = await storage.getAllWhatsappAccounts();
      
      for (const account of accounts) {
        if (account.assignedExternalAgentId && account.autoResponseEnabled) {
          // Obtener datos del agente asignado
          const agentConfig = await storage.getWhatsappAgentConfig(account.id);
          
          if (agentConfig && agentConfig.agentId) {
            this.activeConfigs.set(account.id, {
              accountId: account.id,
              agentId: agentConfig.agentId,
              agentUrl: await this.getAgentUrl(agentConfig.agentId),
              isActive: account.autoResponseEnabled
            });
            
            console.log(`🔧 Configuración cargada: Cuenta ${account.id} → Agente ${agentConfig.agentId}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  }
  
  /**
   * Obtener URL del agente desde la base de datos
   */
  private static async getAgentUrl(agentId: string): Promise<string> {
    try {
      // Consultar agente desde la base de datos de agentes externos
      const { stdout } = await execAsync(`curl -s "http://localhost:5000/api/external-agents" | jq -r '.agents[] | select(.id=="${agentId}") | .agentUrl'`);
      const url = stdout.trim();
      
      if (url && url !== 'null') {
        return url;
      }
      
      return '';
    } catch (error) {
      console.error(`❌ Error obteniendo URL del agente ${agentId}:`, error);
      return '';
    }
  }
  
  /**
   * Procesar mensaje entrante y generar respuesta automática
   */
  static async processIncomingMessage(message: IncomingMessage): Promise<boolean> {
    const messageKey = `${message.accountId}-${message.chatId}-${message.id}`;
    
    // Evitar procesamiento duplicado
    if (this.isProcessing.has(messageKey)) {
      return false;
    }
    
    const config = this.activeConfigs.get(message.accountId);
    if (!config || !config.isActive) {
      return false;
    }
    
    this.isProcessing.add(messageKey);
    
    try {
      console.log(`🔄 Procesando mensaje automático: ${message.message.substring(0, 50)}...`);
      
      // 1. Ejecutar web scraping para obtener respuesta del agente externo
      const agentResponse = await this.getAgentResponse(
        config.agentUrl,
        message.message,
        config.agentId
      );
      
      if (agentResponse.success && agentResponse.response) {
        // 2. Enviar respuesta automáticamente al chat
        const sent = await this.sendAutomaticResponse(
          message.accountId,
          message.chatId,
          agentResponse.response
        );
        
        if (sent) {
          console.log(`✅ Respuesta automática enviada al chat ${message.chatId}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error procesando mensaje automático:`, error);
      return false;
    } finally {
      this.isProcessing.delete(messageKey);
    }
  }
  
  /**
   * Obtener respuesta del agente externo via web scraping
   */
  private static async getAgentResponse(
    agentUrl: string,
    message: string,
    agentId: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      console.log(`🤖 Consultando agente ${agentId}: ${agentUrl}`);
      
      // Ejecutar el script de Python para web scraping
      const command = `cd server/services && python3 simpleWebScrapingService.py "${agentUrl}" "${message.replace(/"/g, '\\"')}" "${agentId}"`;
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.error(`⚠️ Advertencia del agente ${agentId}:`, stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.success) {
        console.log(`✅ Respuesta obtenida del agente ${agentId} (${result.processing_time}s)`);
        return {
          success: true,
          response: result.response
        };
      } else {
        console.error(`❌ Error del agente ${agentId}:`, result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error(`❌ Error ejecutando web scraping:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Enviar respuesta automática al chat de WhatsApp
   */
  private static async sendAutomaticResponse(
    accountId: number,
    chatId: string,
    responseMessage: string
  ): Promise<boolean> {
    try {
      // Enviar mensaje a través de la API de WhatsApp
      const response = await fetch(`http://localhost:5000/api/whatsapp-accounts/${accountId}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: chatId,
          message: responseMessage
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`📤 Mensaje enviado automáticamente al chat ${chatId}`);
        return true;
      } else {
        console.error(`❌ Error enviando mensaje:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error en envío automático:`, error);
      return false;
    }
  }
  
  /**
   * Activar web scraping automático para una cuenta
   */
  static async enableForAccount(accountId: number, agentId: string): Promise<boolean> {
    try {
      const agentUrl = await this.getAgentUrl(agentId);
      
      if (!agentUrl) {
        console.error(`❌ No se pudo obtener URL del agente ${agentId}`);
        return false;
      }
      
      this.activeConfigs.set(accountId, {
        accountId,
        agentId,
        agentUrl,
        isActive: true
      });
      
      console.log(`🔧 Web scraping automático activado: Cuenta ${accountId} → Agente ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error activando web scraping:`, error);
      return false;
    }
  }
  
  /**
   * Desactivar web scraping automático para una cuenta
   */
  static disableForAccount(accountId: number): void {
    this.activeConfigs.delete(accountId);
    console.log(`🔴 Web scraping automático desactivado para cuenta ${accountId}`);
  }
  
  /**
   * Verificar si una cuenta tiene web scraping activo
   */
  static isActiveForAccount(accountId: number): boolean {
    const config = this.activeConfigs.get(accountId);
    return config ? config.isActive : false;
  }
  
  /**
   * Obtener estadísticas del sistema
   */
  static getStats(): { activeAccounts: number; processingMessages: number } {
    return {
      activeAccounts: this.activeConfigs.size,
      processingMessages: this.isProcessing.size
    };
  }
}