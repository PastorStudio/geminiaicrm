/**
 * Sistema completamente independiente de respuestas automáticas
 * Funciona sin ninguna dependencia del frontend
 */

import { db } from '../db';
import { whatsappAccounts, whatsappMessages, externalAgents } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import OpenAI from 'openai';

interface IndependentConfig {
  accountId: number;
  enabled: boolean;
  agentName: string;
  lastProcessed: Date;
}

class IndependentAutoResponseService {
  private configs = new Map<number, IndependentConfig>();
  private processingInterval?: NodeJS.Timeout;
  private isRunning = false;
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Inicializa el servicio completamente independiente
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('🤖 Sistema independiente ya está funcionando');
      return;
    }

    console.log('🚀 Iniciando sistema de respuestas automáticas INDEPENDIENTE...');
    
    try {
      // Cargar configuraciones desde la base de datos
      await this.loadConfigurations();
      
      // Iniciar procesamiento continuo
      this.startContinuousProcessing();
      
      this.isRunning = true;
      console.log('✅ Sistema independiente iniciado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando sistema independiente:', error);
      throw error;
    }
  }

  /**
   * Carga configuraciones desde la base de datos
   */
  private async loadConfigurations(): Promise<void> {
    try {
      console.log('🔄 Cargando configuraciones de respuestas automáticas...');
      
      const accounts = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.autoResponseEnabled, true));

      for (const account of accounts) {
        this.configs.set(account.id, {
          accountId: account.id,
          enabled: true,
          agentName: account.assignedExternalAgentId ? 'AI Assistant' : 'Smart Bot',
          lastProcessed: new Date()
        });
      }

      console.log(`📊 Configuraciones cargadas para ${this.configs.size} cuentas`);
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  }

  /**
   * Inicia procesamiento continuo cada 10 segundos
   */
  private startContinuousProcessing(): void {
    console.log('⏰ Iniciando procesamiento continuo cada 10 segundos...');
    
    this.processingInterval = setInterval(async () => {
      await this.processNewMessages();
    }, 10000); // Cada 10 segundos
  }

  /**
   * Procesa mensajes nuevos de forma independiente
   */
  private async processNewMessages(): Promise<void> {
    if (this.configs.size === 0) {
      return;
    }

    try {
      for (const [accountId, config] of this.configs) {
        if (!config.enabled) continue;

        // Buscar mensajes nuevos desde la última vez procesada
        const newMessages = await db
          .select()
          .from(whatsappMessages)
          .where(
            and(
              eq(whatsappMessages.accountId, accountId),
              eq(whatsappMessages.from_me, false)
            )
          )
          .orderBy(desc(whatsappMessages.timestamp))
          .limit(5);

        for (const message of newMessages) {
          await this.processMessage(accountId, message);
        }

        // Actualizar última vez procesada
        config.lastProcessed = new Date();
      }
    } catch (error) {
      console.error('❌ Error procesando mensajes nuevos:', error);
    }
  }

  /**
   * Procesa un mensaje individual
   */
  private async processMessage(accountId: number, message: any): Promise<void> {
    try {
      const config = this.configs.get(accountId);
      if (!config) return;

      console.log(`🤖 Procesando mensaje independiente - Cuenta: ${accountId}, Chat: ${message.chatId}`);

      // Generar respuesta usando IA
      const response = await this.generateAIResponse(message.content, config.agentName);
      
      if (response) {
        // Simular envío de respuesta (aquí se conectaría con WhatsApp real)
        console.log(`📤 Respuesta generada para ${message.chatId}: "${response.substring(0, 50)}..."`);
        
        // Guardar la respuesta en la base de datos
        await this.saveResponse(accountId, message.chatId, response);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje individual:', error);
    }
  }

  /**
   * Genera respuesta usando IA
   */
  private async generateAIResponse(messageText: string, agentName: string): Promise<string | null> {
    try {
      const prompt = `Eres ${agentName}, un asistente de atención al cliente profesional y amigable.
Responde al siguiente mensaje de manera útil y concisa:

Mensaje: "${messageText}"

Respuesta:`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Eres un asistente de atención al cliente profesional. Responde de manera útil, amigable y concisa."
          },
          {
            role: "user",
            content: messageText
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('❌ Error generando respuesta IA:', error);
      return null;
    }
  }

  /**
   * Guarda la respuesta en la base de datos
   */
  private async saveResponse(accountId: number, chatId: string, response: string): Promise<void> {
    try {
      await db.insert(whatsappMessages).values({
        accountId,
        chatId,
        messageId: `auto_${Date.now()}`,
        content: response,
        fromMe: true,
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      });
    } catch (error) {
      console.error('❌ Error guardando respuesta:', error);
    }
  }

  /**
   * Habilita respuestas automáticas para una cuenta
   */
  async enableForAccount(accountId: number, agentName: string = 'AI Assistant'): Promise<void> {
    console.log(`🟢 Habilitando respuestas independientes para cuenta ${accountId}`);
    
    this.configs.set(accountId, {
      accountId,
      enabled: true,
      agentName,
      lastProcessed: new Date()
    });

    // Actualizar en base de datos
    await db
      .update(whatsappAccounts)
      .set({ autoResponseEnabled: true })
      .where(eq(whatsappAccounts.id, accountId));
  }

  /**
   * Deshabilita respuestas automáticas para una cuenta
   */
  async disableForAccount(accountId: number): Promise<void> {
    console.log(`🔴 Deshabilitando respuestas independientes para cuenta ${accountId}`);
    
    this.configs.delete(accountId);

    // Actualizar en base de datos
    await db
      .update(whatsappAccounts)
      .set({ autoResponseEnabled: false })
      .where(eq(whatsappAccounts.id, accountId));
  }

  /**
   * Obtiene estado del sistema
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      activeAccounts: Array.from(this.configs.keys()),
      totalConfigs: this.configs.size,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Detiene el sistema
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    this.isRunning = false;
    console.log('🛑 Sistema independiente detenido');
  }
}

// Exportar instancia única
export const independentAutoResponseService = new IndependentAutoResponseService();