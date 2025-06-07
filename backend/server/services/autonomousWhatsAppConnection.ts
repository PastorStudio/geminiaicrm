/**
 * Autonomous WhatsApp Connection Manager
 * Maintains WhatsApp connections independently of any frontend interface
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import { pool } from '../db';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

interface AutonomousWhatsAppClient {
  accountId: number;
  client: Client;
  isReady: boolean;
  autoResponseEnabled: boolean;
  agentName: string;
}

class AutonomousWhatsAppConnectionManager {
  private clients = new Map<number, AutonomousWhatsAppClient>();
  private openai: OpenAI;
  private messageProcessingInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Initialize autonomous WhatsApp connections
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Gestor autónomo de WhatsApp ya está funcionando');
      return;
    }

    console.log('🚀 Iniciando gestor AUTÓNOMO de conexiones WhatsApp...');
    
    try {
      // Load WhatsApp accounts from database
      await this.loadWhatsAppAccounts();
      
      // Start message processing
      this.startMessageProcessing();
      
      this.isRunning = true;
      console.log('✅ Gestor autónomo de WhatsApp iniciado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando gestor autónomo de WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Load WhatsApp accounts and create autonomous clients
   */
  private async loadWhatsAppAccounts(): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT id, name, autoresponseenabled 
        FROM whatsapp_accounts 
        WHERE autoresponseenabled = true
      `);

      for (const account of result.rows) {
        await this.createAutonomousClient(account.id, account.name);
      }

      console.log(`📱 ${this.clients.size} clientes autónomos de WhatsApp creados`);
    } catch (error) {
      console.error('❌ Error cargando cuentas de WhatsApp:', error);
    }
  }

  /**
   * Create autonomous WhatsApp client for account
   */
  private async createAutonomousClient(accountId: number, accountName: string): Promise<void> {
    try {
      console.log(`📱 Creando cliente autónomo para cuenta ${accountId} (${accountName})`);

      const sessionPath = path.join(process.cwd(), 'temp', 'whatsapp-accounts', `account_${accountId}`);
      
      // Ensure session directory exists
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `autonomous_account_${accountId}`,
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Set up event handlers for autonomous operation
      this.setupClientEventHandlers(client, accountId, accountName);

      // Initialize client
      await client.initialize();

      // Store autonomous client
      this.clients.set(accountId, {
        accountId,
        client,
        isReady: false,
        autoResponseEnabled: true,
        agentName: 'Autonomous AI Assistant'
      });

    } catch (error) {
      console.error(`❌ Error creando cliente autónomo para cuenta ${accountId}:`, error);
    }
  }

  /**
   * Setup event handlers for autonomous client operation
   */
  private setupClientEventHandlers(client: Client, accountId: number, accountName: string): void {
    client.on('qr', (qr) => {
      console.log(`📱 Código QR generado para cuenta autónoma ${accountId}:`);
      console.log(qr);
      
      // Save QR to file for manual scanning if needed
      const qrPath = path.join(process.cwd(), 'temp', 'whatsapp-accounts', `account_${accountId}`, 'autonomous_qr.txt');
      fs.writeFileSync(qrPath, qr);
      console.log(`💾 QR guardado en: ${qrPath}`);
    });

    client.on('ready', () => {
      console.log(`✅ Cliente autónomo ${accountId} (${accountName}) está listo`);
      
      const autonomousClient = this.clients.get(accountId);
      if (autonomousClient) {
        autonomousClient.isReady = true;
      }
    });

    client.on('message', async (message) => {
      await this.handleIncomingMessage(accountId, message);
    });

    client.on('disconnected', (reason) => {
      console.log(`🔴 Cliente autónomo ${accountId} desconectado:`, reason);
      
      const autonomousClient = this.clients.get(accountId);
      if (autonomousClient) {
        autonomousClient.isReady = false;
      }

      // Attempt to reconnect after 30 seconds
      setTimeout(() => {
        console.log(`🔄 Intentando reconectar cliente autónomo ${accountId}...`);
        client.initialize();
      }, 30000);
    });

    client.on('auth_failure', (message) => {
      console.error(`❌ Error de autenticación en cliente autónomo ${accountId}:`, message);
    });
  }

  /**
   * Handle incoming messages autonomously
   */
  private async handleIncomingMessage(accountId: number, message: any): Promise<void> {
    try {
      // Skip messages from self
      if (message.fromMe) {
        return;
      }

      const autonomousClient = this.clients.get(accountId);
      if (!autonomousClient || !autonomousClient.autoResponseEnabled) {
        return;
      }

      console.log(`📩 Mensaje recibido en cuenta autónoma ${accountId}: "${message.body?.substring(0, 50)}..."`);

      // Save message to database
      await this.saveMessageToDatabase(accountId, message);

      // Generate and send autonomous response
      await this.generateAndSendResponse(accountId, message);

    } catch (error) {
      console.error(`❌ Error procesando mensaje en cuenta autónoma ${accountId}:`, error);
    }
  }

  /**
   * Save message to database
   */
  private async saveMessageToDatabase(accountId: number, message: any): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO whatsapp_messages ("accountId", "chatId", "messageId", content, from_me, timestamp, "createdAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT ("messageId") DO NOTHING
      `, [
        accountId,
        message.from,
        message.id._serialized,
        message.body || '',
        false
      ]);
    } catch (error) {
      console.error('❌ Error guardando mensaje autónomo:', error);
    }
  }

  /**
   * Generate and send autonomous response
   */
  private async generateAndSendResponse(accountId: number, message: any): Promise<void> {
    try {
      const autonomousClient = this.clients.get(accountId);
      if (!autonomousClient || !autonomousClient.client || !autonomousClient.isReady) {
        return;
      }

      // Generate AI response
      const response = await this.generateAIResponse(message.body, autonomousClient.agentName);
      
      if (response) {
        // Send response through WhatsApp
        const chat = await message.getChat();
        await chat.sendMessage(response);

        console.log(`📤 Respuesta autónoma enviada en cuenta ${accountId}: "${response.substring(0, 50)}..."`);

        // Save response to database
        await this.saveResponseToDatabase(accountId, message.from, response);
      }

    } catch (error) {
      console.error('❌ Error enviando respuesta autónoma:', error);
    }
  }

  /**
   * Generate AI response
   */
  private async generateAIResponse(messageText: string, agentName: string): Promise<string | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Eres ${agentName}, un asistente de atención al cliente profesional y amigable. Responde de manera útil, amigable y concisa en español.`
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
      console.error('❌ Error generando respuesta de IA:', error);
      return null;
    }
  }

  /**
   * Save response to database
   */
  private async saveResponseToDatabase(accountId: number, chatId: string, response: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO whatsapp_messages ("accountId", "chatId", "messageId", content, from_me, timestamp, "createdAt")
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      `, [
        accountId,
        chatId,
        `autonomous_response_${Date.now()}_${Math.random()}`,
        response
      ]);
    } catch (error) {
      console.error('❌ Error guardando respuesta autónoma:', error);
    }
  }

  /**
   * Start message processing interval
   */
  private startMessageProcessing(): void {
    console.log('⏰ Iniciando procesamiento autónomo de mensajes...');
    
    this.messageProcessingInterval = setInterval(() => {
      this.checkClientStatus();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check client status and maintain connections
   */
  private checkClientStatus(): void {
    for (const [accountId, autonomousClient] of this.clients) {
      if (!autonomousClient.isReady) {
        console.log(`🔄 Cliente autónomo ${accountId} no está listo, verificando estado...`);
      } else {
        console.log(`✅ Cliente autónomo ${accountId} está activo y funcionando`);
      }
    }
  }

  /**
   * Get status of autonomous connections
   */
  getStatus(): any {
    const status = {
      isRunning: this.isRunning,
      totalClients: this.clients.size,
      readyClients: 0,
      clientStatus: [] as any[]
    };

    for (const [accountId, client] of this.clients) {
      if (client.isReady) {
        status.readyClients++;
      }

      status.clientStatus.push({
        accountId,
        isReady: client.isReady,
        autoResponseEnabled: client.autoResponseEnabled,
        agentName: client.agentName
      });
    }

    return status;
  }

  /**
   * Stop autonomous connections
   */
  async stop(): Promise<void> {
    console.log('🛑 Deteniendo gestor autónomo de WhatsApp...');

    if (this.messageProcessingInterval) {
      clearInterval(this.messageProcessingInterval);
    }

    for (const [accountId, autonomousClient] of this.clients) {
      try {
        await autonomousClient.client.destroy();
        console.log(`🔴 Cliente autónomo ${accountId} desconectado`);
      } catch (error) {
        console.error(`❌ Error desconectando cliente autónomo ${accountId}:`, error);
      }
    }

    this.clients.clear();
    this.isRunning = false;
    console.log('✅ Gestor autónomo de WhatsApp detenido');
  }
}

// Export singleton instance
export const autonomousWhatsAppConnectionManager = new AutonomousWhatsAppConnectionManager();