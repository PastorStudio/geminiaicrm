/**
 * Truly Independent Auto-Response System
 * Works completely independently of frontend - no dependencies whatsoever
 */

import OpenAI from 'openai';
import { pool } from '../db';

interface TrulyIndependentConfig {
  accountId: number;
  enabled: boolean;
  agentName: string;
  lastProcessed: Date;
}

class TrulyIndependentAutoResponseSystem {
  private configs = new Map<number, TrulyIndependentConfig>();
  private processingInterval?: NodeJS.Timeout;
  private isRunning = false;
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Initialize the truly independent system
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('🤖 Sistema verdaderamente independiente ya está funcionando');
      return;
    }

    console.log('🚀 Iniciando sistema VERDADERAMENTE INDEPENDIENTE de respuestas automáticas...');
    
    try {
      // Load configurations from database using direct SQL
      await this.loadConfigurationsFromDatabase();
      
      // Start continuous processing every 15 seconds
      this.startIndependentProcessing();
      
      this.isRunning = true;
      console.log('✅ Sistema verdaderamente independiente iniciado correctamente');
      console.log(`📊 Configurado para ${this.configs.size} cuentas activas`);
    } catch (error) {
      console.error('❌ Error inicializando sistema verdaderamente independiente:', error);
      throw error;
    }
  }

  /**
   * Load configurations from database using direct SQL queries
   */
  private async loadConfigurationsFromDatabase(): Promise<void> {
    try {
      console.log('🔄 Cargando configuraciones usando SQL directo...');
      
      const result = await pool.query(`
        SELECT id, name, autoresponseenabled, assignedexternalagentid 
        FROM whatsapp_accounts 
        WHERE autoresponseenabled = true
      `);

      for (const account of result.rows) {
        this.configs.set(account.id, {
          accountId: account.id,
          enabled: true,
          agentName: account.assignedexternalagentid ? 'AI Assistant' : 'Smart Bot',
          lastProcessed: new Date()
        });
      }

      console.log(`📊 Configuraciones cargadas para ${this.configs.size} cuentas usando SQL directo`);
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  }

  /**
   * Start independent processing every 15 seconds
   */
  private startIndependentProcessing(): void {
    console.log('⏰ Iniciando procesamiento verdaderamente independiente cada 15 segundos...');
    
    this.processingInterval = setInterval(async () => {
      await this.processMessagesIndependently();
    }, 15000); // Every 15 seconds
  }

  /**
   * Process messages completely independently using direct SQL
   */
  private async processMessagesIndependently(): Promise<void> {
    if (this.configs.size === 0) {
      return;
    }

    try {
      for (const [accountId, config] of this.configs) {
        if (!config.enabled) continue;

        // Get recent messages using direct SQL
        const messagesResult = await pool.query(`
          SELECT * FROM whatsapp_messages 
          WHERE "accountId" = $1 
          AND from_me = false 
          AND timestamp > NOW() - INTERVAL '1 hour'
          ORDER BY timestamp DESC 
          LIMIT 3
        `, [accountId]);

        for (const message of messagesResult.rows) {
          await this.processMessageIndependently(accountId, message, config.agentName);
        }

        // Update last processed time
        config.lastProcessed = new Date();
      }
    } catch (error) {
      console.error('❌ Error en procesamiento independiente:', error);
    }
  }

  /**
   * Process individual message independently
   */
  private async processMessageIndependently(accountId: number, message: any, agentName: string): Promise<void> {
    try {
      console.log(`🤖 Procesando mensaje independiente - Cuenta: ${accountId}, Chat: ${message.chatId}`);

      // Check if we already responded to this message
      const responseCheck = await pool.query(`
        SELECT id FROM whatsapp_messages 
        WHERE "chatId" = $1 
        AND from_me = true 
        AND timestamp > $2
        LIMIT 1
      `, [message.chatId, message.timestamp]);

      if (responseCheck.rows.length > 0) {
        console.log(`⏭️ Ya se respondió a este mensaje en chat ${message.chatId}`);
        return;
      }

      // Generate AI response
      const response = await this.generateAIResponseIndependently(message.content, agentName);
      
      if (response) {
        // Save response to database
        await this.saveResponseToDatabase(accountId, message.chatId, response);
        console.log(`📤 Respuesta independiente guardada para ${message.chatId}: "${response.substring(0, 50)}..."`);
        
        // Here would be integration with actual WhatsApp sending
        // For now, we log the response as it would be sent
        console.log(`🟢 RESPUESTA AUTOMÁTICA INDEPENDIENTE ACTIVADA: ${response}`);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje independiente:', error);
    }
  }

  /**
   * Generate AI response completely independently
   */
  private async generateAIResponseIndependently(messageText: string, agentName: string): Promise<string | null> {
    try {
      const prompt = `Eres ${agentName}, un asistente de atención al cliente profesional y amigable.
Responde al siguiente mensaje de manera útil y concisa en español:

Mensaje: "${messageText}"

Respuesta:`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Eres un asistente de atención al cliente profesional. Responde de manera útil, amigable y concisa en español."
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
      console.error('❌ Error generando respuesta IA independiente:', error);
      return null;
    }
  }

  /**
   * Save response to database using direct SQL
   */
  private async saveResponseToDatabase(accountId: number, chatId: string, response: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO whatsapp_messages ("accountId", "chatId", "messageId", content, from_me, timestamp, "createdAt")
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      `, [accountId, chatId, `auto_independent_${Date.now()}`, response]);
    } catch (error) {
      console.error('❌ Error guardando respuesta independiente:', error);
    }
  }

  /**
   * Enable auto-response for account independently
   */
  async enableForAccountIndependently(accountId: number, agentName: string = 'AI Assistant'): Promise<void> {
    console.log(`🟢 Habilitando respuestas verdaderamente independientes para cuenta ${accountId}`);
    
    this.configs.set(accountId, {
      accountId,
      enabled: true,
      agentName,
      lastProcessed: new Date()
    });

    // Update database using direct SQL
    await pool.query(`
      UPDATE whatsapp_accounts 
      SET autoresponseenabled = true 
      WHERE id = $1
    `, [accountId]);
  }

  /**
   * Disable auto-response for account independently
   */
  async disableForAccountIndependently(accountId: number): Promise<void> {
    console.log(`🔴 Deshabilitando respuestas verdaderamente independientes para cuenta ${accountId}`);
    
    this.configs.delete(accountId);

    // Update database using direct SQL
    await pool.query(`
      UPDATE whatsapp_accounts 
      SET autoresponseenabled = false 
      WHERE id = $1
    `, [accountId]);
  }

  /**
   * Get system status independently
   */
  getStatusIndependently(): any {
    return {
      isRunning: this.isRunning,
      activeAccounts: Array.from(this.configs.keys()),
      totalConfigs: this.configs.size,
      lastCheck: new Date().toISOString(),
      systemType: 'TRULY_INDEPENDENT',
      dependencies: 'NONE - Completely independent of frontend'
    };
  }

  /**
   * Stop the independent system
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    this.isRunning = false;
    console.log('🛑 Sistema verdaderamente independiente detenido');
  }
}

// Export singleton instance
export const trulyIndependentAutoResponseSystem = new TrulyIndependentAutoResponseSystem();