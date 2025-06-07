/**
 * Sistema de respuestas automáticas completamente backend
 * No depende del frontend para funcionar
 */

import { db } from '../db';
import { whatsappAccounts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface BackendConfig {
  accountId: number;
  enabled: boolean;
  agentName: string;
}

class BackendAutoResponseManager {
  private configs = new Map<number, BackendConfig>();
  private monitoringInterval?: NodeJS.Timeout;
  private isActive = false;

  /**
   * Inicializa el sistema backend
   */
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando sistema backend de respuestas automáticas...');
    
    try {
      await this.loadConfigurations();
      this.startBackendMonitoring();
      this.isActive = true;
      
      console.log(`✅ Sistema backend inicializado con ${this.configs.size} cuentas activas`);
    } catch (error) {
      console.error('❌ Error inicializando sistema backend:', error);
    }
  }

  /**
   * Carga configuraciones desde la base de datos
   */
  private async loadConfigurations(): Promise<void> {
    try {
      const activeAccounts = await db.select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.autoResponseEnabled, true));

      for (const account of activeAccounts) {
        this.configs.set(account.id, {
          accountId: account.id,
          enabled: true,
          agentName: account.assignedExternalAgentId || 'Smart Assistant'
        });
        
        console.log(`✅ Cuenta ${account.id} configurada para respuestas automáticas backend`);
      }
    } catch (error) {
      console.error('❌ Error cargando configuraciones backend:', error);
    }
  }

  /**
   * Inicia monitoreo continuo
   */
  private startBackendMonitoring(): void {
    console.log('🔄 Iniciando monitoreo backend independiente...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.performBackendTasks();
    }, 15000); // Cada 15 segundos
  }

  /**
   * Ejecuta tareas backend
   */
  private async performBackendTasks(): Promise<void> {
    try {
      // Verificar configuraciones activas
      for (const [accountId, config] of this.configs) {
        if (config.enabled) {
          console.log(`🔄 Cuenta ${accountId} - Respuestas automáticas BACKEND activas`);
        }
      }

      // Procesar conversaciones pendientes
      await this.processBackendConversations();
      
    } catch (error) {
      console.error('❌ Error en tareas backend:', error);
    }
  }

  /**
   * Procesa conversaciones de forma independiente
   */
  private async processBackendConversations(): Promise<void> {
    // Implementar procesamiento de conversaciones sin depender del frontend
    console.log('📝 Procesando conversaciones backend...');
  }

  /**
   * Activa respuestas automáticas para una cuenta
   */
  async enableAutoResponse(accountId: number, agentName: string = 'Smart Assistant'): Promise<void> {
    try {
      // Actualizar base de datos
      await db.update(whatsappAccounts)
        .set({
          autoResponseEnabled: true,
          assignedExternalAgentId: agentName
        })
        .where(eq(whatsappAccounts.id, accountId));

      // Actualizar configuración local
      this.configs.set(accountId, {
        accountId,
        enabled: true,
        agentName
      });

      console.log(`✅ Respuestas automáticas backend activadas para cuenta ${accountId}`);
    } catch (error) {
      console.error('❌ Error activando respuestas backend:', error);
    }
  }

  /**
   * Desactiva respuestas automáticas para una cuenta
   */
  async disableAutoResponse(accountId: number): Promise<void> {
    try {
      // Actualizar base de datos
      await db.update(whatsappAccounts)
        .set({ autoResponseEnabled: false })
        .where(eq(whatsappAccounts.id, accountId));

      // Remover configuración local
      this.configs.delete(accountId);

      console.log(`🛑 Respuestas automáticas backend desactivadas para cuenta ${accountId}`);
    } catch (error) {
      console.error('❌ Error desactivando respuestas backend:', error);
    }
  }

  /**
   * Procesa mensaje con respuesta automática
   */
  async processMessage(accountId: number, chatId: string, messageText: string): Promise<string | null> {
    try {
      const config = this.configs.get(accountId);
      if (!config || !config.enabled) return null;

      console.log(`📨 Procesando mensaje backend - Cuenta: ${accountId}, Chat: ${chatId}`);

      // Generar respuesta con IA
      const response = await this.generateResponse(messageText, config.agentName);
      
      if (response) {
        console.log(`✅ Respuesta generada backend - Cuenta: ${accountId}`);
      }

      return response;
    } catch (error) {
      console.error('❌ Error procesando mensaje backend:', error);
      return null;
    }
  }

  /**
   * Genera respuesta usando IA
   */
  private async generateResponse(messageText: string, agentName: string): Promise<string | null> {
    try {
      const prompt = `
Eres ${agentName}, un asistente especializado en atención al cliente.

Mensaje del cliente: ${messageText}

Responde de manera profesional y útil. Mantén la respuesta concisa pero informativa.
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
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('❌ Error generando respuesta IA backend:', error);
      return null;
    }
  }

  /**
   * Obtiene estado del sistema
   */
  getStatus(): any {
    return {
      active: this.isActive,
      activeConfigs: this.configs.size,
      configs: Array.from(this.configs.values())
    };
  }

  /**
   * Detiene el sistema
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isActive = false;
    console.log('🛑 Sistema backend de respuestas automáticas detenido');
  }
}

// Exportar instancia singleton
export const backendAutoResponseManager = new BackendAutoResponseManager();