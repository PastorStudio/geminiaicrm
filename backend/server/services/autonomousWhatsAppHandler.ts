/**
 * Servicio autónomo de WhatsApp que funciona independientemente del frontend
 * Maneja respuestas automáticas, análisis de conversaciones y generación de leads
 * sin depender de conexiones del navegador
 */

import { whatsappMultiAccountManager } from './whatsappMultiAccountManager';
import { conversationAnalyzer } from './conversationAnalyzer';
import { db } from '../db';
import { whatsappAccounts, conversations, leads, tickets } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface AutoResponseConfig {
  accountId: number;
  enabled: boolean;
  agentName: string;
  lastProcessed: Date;
}

class AutonomousWhatsAppHandler {
  private autoResponseConfigs = new Map<number, AutoResponseConfig>();
  private processingInterval?: NodeJS.Timeout;
  private isInitialized = false;

  /**
   * Inicializa el sistema autónomo
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Inicializando sistema autónomo de WhatsApp...');

    try {
      // Cargar configuraciones de respuestas automáticas
      await this.loadAutoResponseConfigs();

      // Configurar eventos de WhatsApp para respuestas automáticas
      this.setupWhatsAppEventHandlers();

      // Iniciar procesamiento continuo
      this.startContinuousProcessing();

      this.isInitialized = true;
      console.log('✅ Sistema autónomo de WhatsApp inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando sistema autónomo:', error);
    }
  }

  /**
   * Carga configuraciones de respuestas automáticas desde la base de datos
   */
  private async loadAutoResponseConfigs(): Promise<void> {
    try {
      const accounts = await db.select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.autoResponseEnabled, true));

      for (const account of accounts) {
        this.autoResponseConfigs.set(account.id, {
          accountId: account.id,
          enabled: true,
          agentName: account.assignedExternalAgentId || 'Smart Assistant',
          lastProcessed: new Date()
        });
        console.log(`✅ Configuración autónoma cargada para cuenta ${account.id}`);
      }
    } catch (error) {
      console.error('❌ Error cargando configuraciones autónomas:', error);
    }
  }

  /**
   * Configura manejadores de eventos de WhatsApp
   */
  private setupWhatsAppEventHandlers(): void {
    // Escuchar mensajes entrantes para respuestas automáticas
    this.whatsappManager.on('message_received', async (data) => {
      const { accountId, message, chatId } = data;
      
      if (this.shouldProcessMessage(accountId, message)) {
        await this.processIncomingMessage(accountId, chatId, message);
      }
    });

    // Escuchar conexiones exitosas
    this.whatsappManager.on('account_connected', async (accountId) => {
      console.log(`🔗 Cuenta ${accountId} conectada - respuestas automáticas activas`);
      await this.enableAutoResponseForAccount(accountId);
    });

    // Escuchar desconexiones para reintentos
    this.whatsappManager.on('account_disconnected', async (accountId) => {
      console.log(`📱 Cuenta ${accountId} desconectada - manteniendo configuración`);
      setTimeout(() => {
        this.whatsappManager.reconnectAccount(accountId);
      }, 30000);
    });
  }

  /**
   * Determina si se debe procesar un mensaje
   */
  private shouldProcessMessage(accountId: number, message: any): boolean {
    const config = this.autoResponseConfigs.get(accountId);
    if (!config || !config.enabled) return false;

    // Solo procesar mensajes entrantes (no enviados por nosotros)
    if (message.fromMe) return false;

    // No procesar mensajes de grupos por defecto
    if (message.from.includes('@g.us')) return false;

    return true;
  }

  /**
   * Procesa un mensaje entrante con respuesta automática
   */
  private async processIncomingMessage(accountId: number, chatId: string, message: any): Promise<void> {
    try {
      console.log(`📨 Procesando mensaje autónomo - Cuenta: ${accountId}, Chat: ${chatId}`);

      const config = this.autoResponseConfigs.get(accountId);
      if (!config) return;

      // Obtener historial de conversación
      const conversationHistory = await this.getConversationHistory(chatId, accountId);

      // Generar respuesta con IA
      const response = await this.generateAIResponse(message.body, conversationHistory, config.agentName);

      if (response) {
        // Enviar respuesta
        await this.whatsappManager.sendMessage(accountId, chatId, response);
        console.log(`✅ Respuesta autónoma enviada - Cuenta: ${accountId}`);

        // Actualizar última actividad
        config.lastProcessed = new Date();
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje autónomo:', error);
    }
  }

  /**
   * Obtiene historial de conversación
   */
  private async getConversationHistory(chatId: string, accountId: number): Promise<string> {
    try {
      const conversation = await db.select()
        .from(conversations)
        .where(
          and(
            eq(conversations.chatId, chatId),
            eq(conversations.whatsappAccountId, accountId)
          )
        )
        .limit(1);

      if (conversation.length > 0 && conversation[0].messages) {
        const messages = JSON.parse(conversation[0].messages);
        const recentMessages = messages.slice(-10); // Últimos 10 mensajes
        
        return recentMessages.map((msg: any) => 
          `${msg.fromMe ? 'Asistente' : 'Cliente'}: ${msg.body}`
        ).join('\n');
      }

      return '';
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return '';
    }
  }

  /**
   * Genera respuesta usando IA
   */
  private async generateAIResponse(messageText: string, conversationHistory: string, agentName: string): Promise<string | null> {
    try {
      const prompt = `
Eres ${agentName}, un asistente especializado en atención al cliente para WhatsApp.

Historial de conversación:
${conversationHistory}

Último mensaje del cliente: ${messageText}

Responde de manera natural, útil y profesional. Mantén las respuestas concisas pero informativas.
Si el cliente tiene una consulta específica, proporciona información relevante.
Si necesitas más información, haz preguntas claras.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un asistente de atención al cliente profesional y amigable."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('❌ Error generando respuesta IA:', error);
      return null;
    }
  }

  /**
   * Habilita respuestas automáticas para una cuenta
   */
  async enableAutoResponseForAccount(accountId: number, agentName: string = 'Smart Assistant'): Promise<void> {
    try {
      // Actualizar base de datos
      await db.update(whatsappAccounts)
        .set({
          autoResponseEnabled: true,
          assignedExternalAgentId: agentName
        })
        .where(eq(whatsappAccounts.id, accountId));

      // Actualizar configuración en memoria
      this.autoResponseConfigs.set(accountId, {
        accountId,
        enabled: true,
        agentName,
        lastProcessed: new Date()
      });

      console.log(`✅ Respuestas automáticas habilitadas para cuenta ${accountId}`);
    } catch (error) {
      console.error('❌ Error habilitando respuestas automáticas:', error);
    }
  }

  /**
   * Deshabilita respuestas automáticas para una cuenta
   */
  async disableAutoResponseForAccount(accountId: number): Promise<void> {
    try {
      // Actualizar base de datos
      await db.update(whatsappAccounts)
        .set({ autoResponseEnabled: false })
        .where(eq(whatsappAccounts.id, accountId));

      // Remover configuración de memoria
      this.autoResponseConfigs.delete(accountId);

      console.log(`🛑 Respuestas automáticas deshabilitadas para cuenta ${accountId}`);
    } catch (error) {
      console.error('❌ Error deshabilitando respuestas automáticas:', error);
    }
  }

  /**
   * Inicia procesamiento continuo en segundo plano
   */
  private startContinuousProcessing(): void {
    console.log('🔄 Iniciando procesamiento continuo autónomo...');

    // Procesar cada 30 segundos
    this.processingInterval = setInterval(async () => {
      await this.performBackgroundTasks();
    }, 30000);
  }

  /**
   * Realiza tareas en segundo plano
   */
  private async performBackgroundTasks(): Promise<void> {
    try {
      // Verificar estado de conexiones
      await this.checkConnectionStatus();

      // Procesar análisis de conversaciones pendientes
      await this.conversationAnalyzer.processUnanalyzedConversations();

      // Mantener conexiones activas
      await this.maintainActiveConnections();

    } catch (error) {
      console.error('❌ Error en tareas de segundo plano:', error);
    }
  }

  /**
   * Verifica estado de conexiones
   */
  private async checkConnectionStatus(): Promise<void> {
    for (const [accountId, config] of this.autoResponseConfigs) {
      if (config.enabled) {
        const isConnected = await this.whatsappManager.isAccountConnected(accountId);
        if (!isConnected) {
          console.log(`🔄 Reconectando cuenta ${accountId}...`);
          await this.whatsappManager.reconnectAccount(accountId);
        }
      }
    }
  }

  /**
   * Mantiene conexiones activas
   */
  private async maintainActiveConnections(): Promise<void> {
    for (const [accountId] of this.autoResponseConfigs) {
      try {
        await this.whatsappManager.keepAlive(accountId);
      } catch (error) {
        console.error(`❌ Error manteniendo conexión ${accountId}:`, error);
      }
    }
  }

  /**
   * Obtiene estadísticas del sistema autónomo
   */
  getStats(): any {
    return {
      activeAccounts: this.autoResponseConfigs.size,
      isRunning: !!this.processingInterval,
      configs: Array.from(this.autoResponseConfigs.values())
    };
  }

  /**
   * Detiene el sistema autónomo
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log('🛑 Sistema autónomo de WhatsApp detenido');
  }
}

// Crear instancia singleton
export const autonomousWhatsAppHandler = new AutonomousWhatsAppHandler();