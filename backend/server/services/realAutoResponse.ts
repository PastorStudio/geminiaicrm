/**
 * Sistema de respuestas automáticas reales
 * Detecta mensajes nuevos y genera respuestas automáticamente sin intervención humana
 */

import OpenAI from 'openai';
import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';
import { db } from '../db';
import { whatsappAccounts } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configurar OpenAI con la clave del sistema
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
});

interface AutoResponseConfig {
  accountId: number;
  agentName: string;
  enabled: boolean;
  lastProcessedMessageId?: string;
}

class RealAutoResponseManager {
  private configs = new Map<number, AutoResponseConfig>();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private initialized = false;

  /**
   * Activa respuestas automáticas para una cuenta
   */
  async activateAutoResponse(accountId: number, agentName: string = "Smart Assistant"): Promise<boolean> {
    try {
      console.log(`🤖 Activando respuestas automáticas para cuenta ${accountId} con agente: ${agentName}`);
      
      // Guardar en base de datos para persistencia
      await db.update(whatsappAccounts)
        .set({ 
          autoResponseEnabled: true,
          assignedExternalAgentId: agentName 
        })
        .where(eq(whatsappAccounts.id, accountId));
      
      this.configs.set(accountId, {
        accountId,
        agentName,
        enabled: true
      });

      if (!this.isRunning) {
        this.startMonitoring();
      }

      console.log(`✅ Respuestas automáticas ACTIVADAS para cuenta ${accountId} y guardadas en BD`);
      return true;
    } catch (error) {
      console.error(`❌ Error activando respuestas automáticas:`, error);
      return false;
    }
  }

  /**
   * Desactiva respuestas automáticas para una cuenta
   */
  async deactivateAutoResponse(accountId: number): Promise<boolean> {
    try {
      console.log(`🛑 Desactivando respuestas automáticas para cuenta ${accountId}`);
      
      // Guardar en base de datos para persistencia
      await db.update(whatsappAccounts)
        .set({ 
          autoResponseEnabled: false,
          assignedExternalAgentId: null 
        })
        .where(eq(whatsappAccounts.id, accountId));
      
      this.configs.delete(accountId);

      if (this.configs.size === 0) {
        this.stopMonitoring();
      }

      console.log(`✅ Respuestas automáticas DESACTIVADAS para cuenta ${accountId} y guardadas en BD`);
      return true;
    } catch (error) {
      console.error(`❌ Error desactivando respuestas automáticas:`, error);
      return false;
    }
  }

  /**
   * Inicia el monitoreo automático de mensajes
   */
  private startMonitoring(): void {
    if (this.isRunning) return;

    console.log('🚀 Iniciando monitoreo automático de mensajes...');
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      await this.checkForNewMessages();
    }, 12000); // Revisar cada 12 segundos para reducir carga

    console.log('✅ Monitoreo automático iniciado');
  }

  /**
   * Detiene el monitoreo automático
   */
  private stopMonitoring(): void {
    if (!this.isRunning) return;

    console.log('🛑 Deteniendo monitoreo automático...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('✅ Monitoreo automático detenido');
  }

  /**
   * Revisa si hay mensajes nuevos en todas las cuentas activas
   */
  private async checkForNewMessages(): Promise<void> {
    for (const [accountId, config] of this.configs) {
      if (!config.enabled) continue;

      try {
        await this.processAccountMessages(accountId, config);
      } catch (error) {
        console.error(`❌ Error procesando cuenta ${accountId}:`, error);
      }
    }
  }

  /**
   * Procesa mensajes de una cuenta específica
   */
  private async processAccountMessages(accountId: number, config: AutoResponseConfig): Promise<void> {
    try {
      // Obtener chats activos
      const chats = await whatsappMultiAccountManager.getChats(accountId);
      
      for (const chat of chats) {
        await this.processChatMessages(accountId, chat.id, config);
      }
    } catch (error) {
      console.error(`⚠️ Error temporal obteniendo chats de cuenta ${accountId} - manteniendo configuración activa:`, error.message);
      // No desactivar la configuración por errores temporales de conexión
    }
  }

  /**
   * Procesa mensajes de un chat específico
   */
  private async processChatMessages(accountId: number, chatId: string, config: AutoResponseConfig): Promise<void> {
    try {
      // Obtener mensajes del chat
      const messages = await whatsappMultiAccountManager.getMessages(accountId, chatId);
      
      if (!messages || messages.length === 0) return;

      // Buscar el último mensaje recibido (no enviado por nosotros)
      const lastIncomingMessage = messages
        .filter((msg: any) => !msg.fromMe && msg.type === 'chat')
        .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

      if (!lastIncomingMessage) return;

      // Verificar si ya procesamos este mensaje
      const messageKey = `${chatId}_${lastIncomingMessage.id}`;
      if (config.lastProcessedMessageId === messageKey) return;

      console.log(`📨 Nuevo mensaje detectado en chat ${chatId}: "${lastIncomingMessage.body}"`);

      // Generar respuesta automática
      const response = await this.generateResponse(lastIncomingMessage.body, config.agentName, accountId);

      if (response) {
        // Enviar respuesta
        await whatsappMultiAccountManager.sendMessage(accountId, chatId, response);
        console.log(`✅ Respuesta automática enviada: "${response}"`);

        // Marcar como procesado
        config.lastProcessedMessageId = messageKey;
      }

    } catch (error) {
      console.error(`❌ Error procesando chat ${chatId}:`, error);
    }
  }

  /**
   * Obtiene el prompt asignado para una cuenta específica
   */
  private async getAccountPrompt(accountId: number): Promise<string | null> {
    try {
      // Buscar cuenta con prompt asignado
      const accountResult = await db.select({
        assignedPromptId: whatsappAccounts.assignedPromptId
      })
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.id, accountId))
      .limit(1);

      if (accountResult.length === 0 || !accountResult[0].assignedPromptId) {
        return null;
      }

      // Obtener el prompt completo
      const { aiPrompts } = await import('@shared/schema');
      const promptResult = await db.select({
        content: aiPrompts.content,
        name: aiPrompts.name
      })
      .from(aiPrompts)
      .where(eq(aiPrompts.id, accountResult[0].assignedPromptId))
      .limit(1);

      if (promptResult.length > 0) {
        console.log(`🎯 Usando prompt asignado: "${promptResult[0].name}" para cuenta ${accountId}`);
        return promptResult[0].content;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo prompt asignado:`, error);
      return null;
    }
  }

  /**
   * Genera una respuesta usando OpenAI con prompt prioritario
   */
  private async generateResponse(message: string, agentName: string, accountId: number): Promise<string | null> {
    try {
      console.log(`🤖 Generando respuesta para cuenta ${accountId} con ${agentName}: "${message}"`);

      // PRIORIDAD 1: Usar prompt asignado a la cuenta específica
      let systemPrompt = await this.getAccountPrompt(accountId);
      
      // PRIORIDAD 2: Usar prompt genérico si no hay asignado
      if (!systemPrompt) {
        systemPrompt = `Eres ${agentName}, un asistente útil y amigable. Responde de manera concisa y profesional. Siempre en español y con un tono cálido.`;
        console.log(`⚠️ Usando prompt genérico para cuenta ${accountId} - no hay prompt asignado`);
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // El modelo más reciente de OpenAI
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      if (response) {
        console.log(`✅ Respuesta generada: "${response}"`);
        return response;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error generando respuesta:`, error);
      return null;
    }
  }

  /**
   * Inicializa el sistema cargando configuraciones existentes de la BD
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Inicializando sistema de respuestas automáticas...');
      
      // Cargar cuentas con respuestas automáticas activadas
      const activeAccounts = await db.select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.autoResponseEnabled, true));

      for (const account of activeAccounts) {
        if (account.assignedExternalAgentId) {
          this.configs.set(account.id, {
            accountId: account.id,
            agentName: account.assignedExternalAgentId,
            enabled: true
          });
          console.log(`✅ Respuestas automáticas cargadas para cuenta ${account.id} con agente ${account.assignedExternalAgentId}`);
        }
      }

      if (this.configs.size > 0) {
        this.startMonitoring();
        console.log(`🚀 Sistema inicializado con ${this.configs.size} cuentas activas`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Error inicializando sistema de respuestas automáticas:', error);
    }
  }

  /**
   * Obtiene el estado del sistema
   */
  getStatus(): { running: boolean; activeAccounts: number; configs: AutoResponseConfig[] } {
    return {
      running: this.isRunning,
      activeAccounts: this.configs.size,
      configs: Array.from(this.configs.values())
    };
  }
}

// Instancia global
export const realAutoResponseManager = new RealAutoResponseManager();