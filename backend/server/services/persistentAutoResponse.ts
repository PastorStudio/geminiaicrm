/**
 * Servicio de respuestas automáticas persistentes
 * Mantiene las respuestas automáticas activas independientemente de la navegación del usuario
 */

import { db } from '../db';
import { whatsappAccounts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

interface AutoResponseConfig {
  accountId: number;
  enabled: boolean;
  agentId: string;
  responseDelay: number;
  systemPrompt: string;
}

export class PersistentAutoResponseService {
  private activeConfigs: Map<number, AutoResponseConfig> = new Map();
  private openai: OpenAI;
  private isRunning = false;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY 
    });
  }

  /**
   * Inicia el servicio de respuestas automáticas persistentes
   */
  async start() {
    if (this.isRunning) return;
    
    console.log('🚀 Iniciando servicio de respuestas automáticas persistentes...');
    
    // Cargar configuraciones activas desde la base de datos
    await this.loadActiveConfigs();
    
    this.isRunning = true;
    console.log('✅ Servicio de respuestas automáticas persistentes iniciado');
  }

  /**
   * Carga las configuraciones activas desde la base de datos
   */
  private async loadActiveConfigs() {
    try {
      const accounts = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.autoResponseEnabled, true));

      for (const account of accounts) {
        if (account.assignedExternalAgentId) {
          const config: AutoResponseConfig = {
            accountId: account.id,
            enabled: true,
            agentId: account.assignedExternalAgentId,
            responseDelay: account.responseDelay || 3,
            systemPrompt: 'Eres un asistente profesional que ayuda a los clientes'
          };
          
          this.activeConfigs.set(account.id, config);
          console.log(`📱 Configuración cargada para cuenta ${account.id}: agente ${config.agentId}`);
        }
      }

      console.log(`✅ ${this.activeConfigs.size} configuraciones de respuesta automática cargadas`);
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  }

  /**
   * Activa respuestas automáticas para una cuenta
   */
  async activateForAccount(config: AutoResponseConfig): Promise<boolean> {
    try {
      // Guardar en la base de datos
      await db
        .update(whatsappAccounts)
        .set({
          autoResponseEnabled: true,
          assignedExternalAgentId: config.agentId,
          responseDelay: config.responseDelay
        })
        .where(eq(whatsappAccounts.id, config.accountId));

      // Guardar en memoria para procesamiento inmediato
      this.activeConfigs.set(config.accountId, config);
      
      console.log(`✅ Respuestas automáticas activadas para cuenta ${config.accountId}`);
      return true;
    } catch (error) {
      console.error('❌ Error activando respuestas automáticas:', error);
      return false;
    }
  }

  /**
   * Desactiva respuestas automáticas para una cuenta
   */
  async deactivateForAccount(accountId: number): Promise<boolean> {
    try {
      // Actualizar en la base de datos
      await db
        .update(whatsappAccounts)
        .set({
          autoResponseEnabled: false,
          assignedExternalAgentId: null
        })
        .where(eq(whatsappAccounts.id, accountId));

      // Remover de memoria
      this.activeConfigs.delete(accountId);
      
      console.log(`✅ Respuestas automáticas desactivadas para cuenta ${accountId}`);
      return true;
    } catch (error) {
      console.error('❌ Error desactivando respuestas automáticas:', error);
      return false;
    }
  }

  /**
   * Verifica si una cuenta tiene respuestas automáticas activas
   */
  isActiveForAccount(accountId: number): boolean {
    return this.activeConfigs.has(accountId);
  }

  /**
   * Obtiene la configuración de una cuenta
   */
  getConfigForAccount(accountId: number): AutoResponseConfig | null {
    return this.activeConfigs.get(accountId) || null;
  }

  /**
   * Procesa un mensaje entrante y genera respuesta automática si está configurado
   */
  async processMessage(accountId: number, chatId: string, message: string, fromMe: boolean): Promise<{ success: boolean; response?: string }> {
    // No procesar mensajes propios
    if (fromMe) {
      return { success: false };
    }

    const config = this.activeConfigs.get(accountId);
    if (!config || !config.enabled) {
      return { success: false };
    }

    try {
      console.log(`📨 Procesando mensaje automático para cuenta ${accountId}, chat ${chatId}`);

      // Generar respuesta con OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // la versión más reciente de OpenAI
        messages: [
          {
            role: "system",
            content: `${config.systemPrompt}

Eres un asistente de atención al cliente para WhatsApp. 
Responde de manera profesional, concisa y útil.
Mantén un tono amigable pero profesional.
Limita tus respuestas a máximo 200 caracteres para WhatsApp.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        console.log(`✅ Respuesta automática generada para cuenta ${accountId}: "${response.substring(0, 50)}..."`);
        return { success: true, response: response.trim() };
      }

      return { success: false };
    } catch (error) {
      console.error('❌ Error generando respuesta automática:', error);
      return { success: false };
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      activeAccounts: this.activeConfigs.size,
      configs: Array.from(this.activeConfigs.entries()).map(([accountId, config]) => ({
        accountId,
        agentId: config.agentId,
        enabled: config.enabled
      }))
    };
  }
}

// Instancia singleton del servicio
export const persistentAutoResponseService = new PersistentAutoResponseService();